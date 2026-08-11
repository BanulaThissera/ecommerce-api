const express = require("express");

const app = express();

const PORT = 3000;

app.use(express.json());


// Product routes
const productRoutes = require("./routes/products");
app.use("/api/products", productRoutes);


// Auth routes
const authRoutes = require("./routes/auth");
app.use("/api/auth", authRoutes);


// User routes
const userRoutes = require("./routes/users");
app.use("/api/users", userRoutes);


// Home route
app.get("/", (req, res) => {
    res.json({
        message: "E-Commerce API is running!"
    });
});


app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});