export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#111827",
        panel: "#f4f7f8",
        brand: "#0f766e",
        coral: "#e76f51",
        gold: "#f59e0b"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(17, 24, 39, 0.08)",
        lift: "0 14px 30px rgba(15, 118, 110, 0.18)"
      }
    },
  },
  plugins: [],
};
