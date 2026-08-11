const express = require("express");

const app = express();

const PORT = 3000;

app.use(express.json());

// Product routes
const productRoutes = require("./routes/products");
app.use("/api/products", productRoutes);

// Home route
app.get("/", (req, res) => {
    res.json({
        message: "E-Commerce API is running!"
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});