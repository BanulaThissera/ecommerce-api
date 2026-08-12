const express = require("express");

const router = express.Router();

const db = require("../config/db");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");


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
// =====================================================
// GET SINGLE ORDER
// GET /api/orders/:id
// =====================================================

router.get("/:id", authMiddleware, (req, res) => {

    const orderId = req.params.id;
    const userId = req.user.id;

    // Get order
    const orderSql = `
        SELECT
            id,
            total_amount,
            status,
            created_at
        FROM orders
        WHERE id = ? AND user_id = ?
    `;

    db.query(
        orderSql,
        [orderId, userId],
        (err, orderResults) => {

            if (err) {
                return res.status(500).json({
                    message: "Database error",
                    error: err.message
                });
            }

            // Order not found
            if (orderResults.length === 0) {
                return res.status(404).json({
                    message: "Order not found"
                });
            }

            const order = orderResults[0];

            // Get order items
            const itemsSql = `
                SELECT
                    order_items.product_id,
                    products.name,
                    order_items.quantity,
                    order_items.price,
                    (order_items.quantity * order_items.price) AS total
                FROM order_items
                JOIN products
                ON order_items.product_id = products.id
                WHERE order_items.order_id = ?
            `;

            db.query(
                itemsSql,
                [orderId],
                (err, itemResults) => {

                    if (err) {
                        return res.status(500).json({
                            message: "Database error",
                            error: err.message
                        });
                    }

                    res.json({
                        message: "Order details retrieved successfully",
                        order: {
                            id: order.id,
                            total_amount: order.total_amount,
                            status: order.status,
                            created_at: order.created_at,
                            items: itemResults
                        }
                    });

                }
            );

        }
    );

});
// =====================================================
// ADMIN - GET ALL ORDERS
// GET /api/orders/admin/all
// =====================================================

router.get(
    "/admin/all",
    authMiddleware,
    adminMiddleware,
    (req, res) => {

        const sql = `
            SELECT
                orders.id,
                orders.user_id,
                users.name AS customer_name,
                users.email,
                orders.total_amount,
                orders.status,
                orders.created_at
            FROM orders
            JOIN users ON orders.user_id = users.id
            ORDER BY orders.created_at DESC
        `;

        db.query(sql, (err, results) => {

            if (err) {
                return res.status(500).json({
                    message: "Database error",
                    error: err.message
                });
            }

            res.json({
                message: "All orders retrieved successfully",
                orders: results
            });

        });
    }
);


// =====================================================
// ADMIN - UPDATE ORDER STATUS
// PUT /api/orders/admin/:id/status
// =====================================================

router.put(
    "/admin/:id/status",
    authMiddleware,
    adminMiddleware,
    (req, res) => {

        const orderId = req.params.id;
        const { status } = req.body;

        const allowedStatuses = [
            "pending",
            "processing",
            "shipped",
            "delivered",
            "cancelled"
        ];

        if (!allowedStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid order status"
            });
        }

        const sql = `
            UPDATE orders
            SET status = ?
            WHERE id = ?
        `;

        db.query(
            sql,
            [status, orderId],
            (err, result) => {

                if (err) {
                    return res.status(500).json({
                        message: "Database error",
                        error: err.message
                    });
                }

                if (result.affectedRows === 0) {
                    return res.status(404).json({
                        message: "Order not found"
                    });
                }

                res.json({
                    message: "Order status updated successfully",
                    orderId: orderId,
                    status: status
                });

            }
        );
    }
);
module.exports = router;