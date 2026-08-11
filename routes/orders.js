const express = require("express");

const router = express.Router();

const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");


// =====================================================
// CHECKOUT
// POST /api/orders
// =====================================================

router.post("/", authMiddleware, (req, res) => {

    const userId = req.user.id;

    // Get user's cart
    const cartSql = `
        SELECT
            cart.product_id,
            cart.quantity,
            products.price
        FROM cart
        JOIN products
        ON cart.product_id = products.id
        WHERE cart.user_id = ?
    `;

    db.query(cartSql, [userId], (err, cartItems) => {

        if (err) {
            return res.status(500).json({
                message: "Database error",
                error: err.message
            });
        }

        // Check empty cart
        if (cartItems.length === 0) {
            return res.status(400).json({
                message: "Cart is empty"
            });
        }

        // Calculate total
        let totalAmount = 0;

        cartItems.forEach(item => {
            totalAmount += item.price * item.quantity;
        });

        // Create order
        const orderSql = `
            INSERT INTO orders
            (user_id, total_amount, status)
            VALUES (?, ?, 'pending')
        `;

        db.query(
            orderSql,
            [userId, totalAmount],
            (err, orderResult) => {

                if (err) {
                    return res.status(500).json({
                        message: "Failed to create order",
                        error: err.message
                    });
                }

                const orderId = orderResult.insertId;

                // Insert order items
                const itemSql = `
                    INSERT INTO order_items
                    (order_id, product_id, quantity, price)
                    VALUES ?
                `;

                const values = cartItems.map(item => [
                    orderId,
                    item.product_id,
                    item.quantity,
                    item.price
                ]);

                db.query(
                    itemSql,
                    [values],
                    (err) => {

                        if (err) {
                            return res.status(500).json({
                                message: "Failed to create order items",
                                error: err.message
                            });
                        }

                        // Clear cart
                        const clearCartSql = `
                            DELETE FROM cart
                            WHERE user_id = ?
                        `;

                        db.query(
                            clearCartSql,
                            [userId],
                            (err) => {

                                if (err) {
                                    return res.status(500).json({
                                        message: "Order created but cart clearing failed",
                                        error: err.message
                                    });
                                }

                                res.status(201).json({
                                    message: "Order placed successfully",
                                    orderId: orderId,
                                    totalAmount: totalAmount,
                                    status: "pending"
                                });

                            }
                        );

                    }
                );

            }
        );

    });

});
// =====================================================
// GET MY ORDERS
// GET /api/orders
// =====================================================

router.get("/", authMiddleware, (req, res) => {

    const userId = req.user.id;

    const sql = `
        SELECT
            id,
            total_amount,
            status,
            created_at
        FROM orders
        WHERE user_id = ?
        ORDER BY created_at DESC
    `;

    db.query(sql, [userId], (err, results) => {

        if (err) {
            return res.status(500).json({
                message: "Database error",
                error: err.message
            });
        }

        res.json({
            message: "Orders retrieved successfully",
            orders: results
        });

    });

});

module.exports = router;