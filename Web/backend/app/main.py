from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, RedirectResponse
from websockets.exceptions import ConnectionClosed
import json
import os
import cv2
from ultralytics import YOLO
import torch
import time
import asyncio
import requests
import json
import httpx

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ข้อมูลผู้ใช้ตัวอย่าง
VALID_USERS = {
    "admin": "admin",
    "user1": "admin"
}

# เรียกใช้งาน static (เหมาะกับการใช้งานร่วมกับ FastAPI)
app.mount("/static", StaticFiles(directory="./frontend/static"), name="static")
templates = Jinja2Templates(directory="./frontend/static")


device = 'cuda' if torch.cuda.is_available() else 'cpu'
# เปลี่ยนเป็น path model ของคุณ
model = YOLO('/home/jira-dev/WorkSpace-AumJixs/Super_AI_5/Super-AI-Innovator/runs/detect/exp_name/weights/best.pt').to(device)

tmp_folder = './backend/app/tmp/'
os.makedirs(tmp_folder, exist_ok=True)

async def process_video_stream(video_path: str, conf_threshold: float = 0.65):
    cap = cv2.VideoCapture(video_path)
    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = int(cap.get(cv2.CAP_PROP_FPS))
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter('./backend/app/tmp/output_video.mp4', fourcc, fps, (frame_width, frame_height))

    tracked_objects = set()
    total_unique_objects = 0
    prev_time = time.time()

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        current_time = time.time()
        fps_value = 1 / (current_time - prev_time) if current_time != prev_time else 0
        prev_time = current_time

        results = model.track(frame, device='cuda', conf=conf_threshold, persist=True)
        current_frame_objects = 0

        for result in results:
            for box in result.boxes:
                if box.conf[0] >= conf_threshold:
                    obj_id = int(box.id.item()) if box.id is not None else None
                    x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                    conf = box.conf[0].item()
                    cls_id = int(box.cls[0].item())
                    cls_name = model.names[cls_id]

                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    label = f"{cls_name} {conf:.2f}" + (f" ID:{obj_id}" if obj_id is not None else "")
                    cv2.putText(frame, label, (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                    current_frame_objects += 1
                    if obj_id is not None and obj_id not in tracked_objects:
                        tracked_objects.add(obj_id)
                        total_unique_objects += 1

        cv2.putText(frame, f'FPS: {fps_value:.2f}', (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
        cv2.putText(frame, f'Current objects: {current_frame_objects}', (50, 90), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
        cv2.putText(frame, f'Unique objects: {total_unique_objects}', (50, 130), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
        out.write(frame)

        # ส่งสถานะการประมวลผลเป็น JSON
        yield json.dumps({
            "status": "processing",
            "current_objects": current_frame_objects,
            "unique_objects": total_unique_objects,
            "fps": fps_value
        }) + "\n"

    cap.release()
    out.release()
    cv2.destroyAllWindows()

    yield json.dumps({
        "status": "success",
        "message": f"การประมวลผลเสร็จสิ้น! พบวัตถุที่ไม่ซ้ำทั้งหมด {total_unique_objects} ชิ้น",
        "output_file": "./backend/app/tmp/output_video.mp4"
    }) + "\n"

@app.post("/process_video")
async def process_video(video: UploadFile = File(...), options: str = Form(...)):
    analysis_options = json.loads(options)

    allowed_types = ["video/mp4", "video/quicktime", "video/x-msvideo"]
    if video.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="ประเภทไฟล์ไม่ถูกต้อง")

    if all(not v for v in analysis_options.values()):
        raise HTTPException(status_code=400, ผdetail="กรุณาเลือกการวิเคราะห์")
    
    # Clear tmp directory
    if os.listdir('./backend/app/tmp'):
        for f in os.listdir('./backend/app/tmp'):
            os.remove(os.path.join('./backend/app/tmp', f))
    
    # Save uploaded video to tmp directory
    tmp_video = f'./backend/app/tmp/tmp_{video.filename}'
    with open(tmp_video, "wb") as buffer:
        content = await video.read()
        buffer.write(content)

    if analysis_options['soundSignal']:
            async with httpx.AsyncClient() as client:
                try:
                    response = await client.post(
                        "https://j1ra.app.n8n.cloud/webhook-test/sound-signal",
                        json={"value": True}
                    )
                    response.raise_for_status()  # ตรวจสอบว่า request สำเร็จ
                    print(f"Successfully sent to sound-signal API: {response.status_code}")
                except httpx.HTTPStatusError as e:
                    print(f"Error sending to sound-signal API: {e.response.status_code}")
                    # อาจเลือก raise HTTPException หรือแค่ log ข้อผิดพลาด
                    # raise HTTPException(status_code=500, detail=f"Failed to send to sound-signal API: {str(e)}")
                except httpx.RequestError as e:
                    print(f"Network error when sending to sound-signal API: {str(e)}")
                    # raise HTTPException(status_code=500, detail=f"Network error: {str(e)}")

    return {"status": "success", "video_path": tmp_video}

# WebSocket connection
@app.websocket("/ws")
async def get_stream(websocket: WebSocket):
    await websocket.accept()

    try:
        # Receive video path from client
        data = await websocket.receive_json()
        video_path = data.get("video_path")
        print(video_path)
        if not video_path or not os.path.exists(video_path):
            await websocket.send_json({"status": "error", "message": "ไม่พบไฟล์วิดีโอ"})
            return

        conf_threshold = 0.65
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            await websocket.send_json({"status": "error", "message": "ไม่สามารถเปิดไฟล์วิดีโอได้"})
            return

        frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fps = int(cap.get(cv2.CAP_PROP_FPS))

        tracked_objects = set()
        total_unique_objects = 0
        prev_time = time.time()

        while cap.isOpened():
            success, frame = cap.read()
            if not success:
                break

            current_time = time.time()
            fps_value = 1 / (current_time - prev_time) if current_time != prev_time else 0
            prev_time = current_time

            # Process frame with YOLO
            results = model.track(frame, device=device, conf=conf_threshold, persist=True)
            current_frame_objects = 0

            for result in results:
                for box in result.boxes:
                    if box.conf[0] >= conf_threshold:
                        obj_id = int(box.id.item()) if box.id is not None else None
                        x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
                        conf = box.conf[0].item()
                        cls_id = int(box.cls[0].item())
                        cls_name = model.names[cls_id]

                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                        label = f"{cls_name} {conf:.2f}" + (f" ID:{obj_id}" if obj_id is not None else "")
                        cv2.putText(frame, label, (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                        current_frame_objects += 1
                        if obj_id is not None and obj_id not in tracked_objects:
                            tracked_objects.add(obj_id)
                            total_unique_objects += 1

            # Add text overlays
            cv2.putText(frame, f'FPS: {fps_value:.2f}', (50, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
            cv2.putText(frame, f'Current objects: {current_frame_objects}', (50, 90), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
            cv2.putText(frame, f'Unique objects: {total_unique_objects}', (50, 130), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)

            # Encode frame as JPEG
            ret, buffer = cv2.imencode('.jpg', frame)
            if not ret:
                continue
            
            # Send frame and metadata
            await websocket.send_bytes(buffer.tobytes())
            await websocket.send_json({
                "status": "processing",
                "current_objects": current_frame_objects,
                "unique_objects": total_unique_objects,
                "fps": fps_value
            })

            # Control frame rate
            await asyncio.sleep(1.0 / max(fps, 1))

        # Send completion message
        await websocket.send_json({
            "status": "success",
            "message": f"การประมวลผลเสร็จสิ้น! พบวัตถุที่ไม่ซ้ำทั้งหมด {total_unique_objects} ชิ้น"
        })

    except (WebSocketDisconnect, ConnectionClosed):
        print("Client disconnected")
    except Exception as e:
        print(f"Error: {str(e)}")
        await websocket.send_json({"status": "error", "message": str(e)})
    finally:
        cap.release()
        await websocket.close()

# หน้าเข้าสู่ระบบ (เหมาะกับการใช้งานร่วมกับ FastAPI)
@app.get("/", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# post ธรรมดา
@app.post("/login")
async def login(username: str = Form(...), password: str = Form(...)):
    if username in VALID_USERS and VALID_USERS[username] == password:
        return RedirectResponse(url="/main", status_code=303)
    else:
        raise HTTPException(status_code=401, detail="ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง")

@app.get("/main")
def main(request: Request):
    return templates.TemplateResponse("main.html", {"request": request})

if __name__ == '__main__':
    import uvicorn
    uvicorn.run(app, host='0.0.0.0', port=8000)