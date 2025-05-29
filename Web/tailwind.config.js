module.exports = {
  content: ["./frontend/static/index.html", 
            "./frontend/static/js/**/*.js"],
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["bumblebee", "sunset","cupcake","dim"],
  },
};
