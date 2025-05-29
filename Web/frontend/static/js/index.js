document.addEventListener("DOMContentLoaded", () => {
    const submitBtn = document.getElementById("submitBtn");
    if (submitBtn) {
        submitBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            
            const username = document.getElementById("Username").value;
            const password = document.getElementById("Password").value;

            try {
                const response = await fetch("/login", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: `username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`
                });

                if (response.redirected) {
                    window.location.href = response.url;
                } else if (!response.ok) {
                    const error = await response.json();
                    showError(error.detail);
                }
            } catch (err) {
                showError("Connection error");
                console.error("Login error:", err);
            }
        });
    }
});

function showError(message) {
    let errorBox = document.getElementById("error-message");
    if (!errorBox) {
        errorBox = document.createElement("div");
        errorBox.id = "error-message";
        errorBox.className = "text-red-500 text-sm mt-2 text-center";
        document.querySelector("form").appendChild(errorBox);
    }
    errorBox.textContent = message;
}