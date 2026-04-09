import my_db from "../module/db.js";
import razorpay from "../config/razorpay.js";
import crypto from "crypto";
import transporter from "../config/mailer.js";

//CREATE ORDER
const createOrder = async (req, res) => {
  const { package_id, persons } = req.body;

  try {
    const [pkg] = await my_db.query(
      "SELECT sell_price FROM packages WHERE id = ?",
      [package_id],
    );

    if (!pkg.length) {
      return res.status(400).json({
        success: false,
        message: "Invalid package",
      });
    }

    const amount = pkg[0].sell_price * persons * 100;

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: "receipt_" + Date.now(),
    });

    return res.json(order);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Order creation failed",
      error: error.message,
    });
  }
};

//VERIFY PAYMENT
const verifyPayment = async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    package_id,
    persons,
    travel_date,
  } = req.body;

  try {
    const generated_signature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      });
    }

    const user_id = req?.user?.id;
    const user_name = req?.user?.name;
    const user_phone = req?.user?.phone;
    const email_id = req?.user?.email;

    // 1. Get package details
    const [pkgResult] = await my_db.query(
      "SELECT sell_price, title FROM packages WHERE id = ?",
      [package_id],
    );

    if (!pkgResult.length) {
      return res.status(404).json({
        success: false,
        message: "Package not found",
      });
    }

    const { sell_price, title } = pkgResult[0];
    const total_amount = sell_price * persons;

    // 2. Create booking
    const [bookingResult] = await my_db.query(
      `INSERT INTO bookings 
      (user_id, user_name, user_phone, package_id, travel_date, persons, total_amount, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMED')`,
      [
        user_id,
        user_name,
        user_phone,
        package_id,
        travel_date,
        persons,
        total_amount,
      ],
    );

    const booking_id = bookingResult.insertId;

    // 3. Save payment
    const payment_status =
      generated_signature === razorpay_signature ? "SUCCESS" : "FAILED";
    await my_db.query(
      `INSERT INTO payments 
      (booking_id, email_id, amount, payment_status, transaction_id)
      VALUES (?, ?, ?, ?, ?)`,
      [booking_id, email_id, total_amount, payment_status, razorpay_payment_id],
    );

    // 4. Get user details
    const [userResult] = await my_db.query(
      "SELECT email, name FROM users WHERE id = ?",
      [user_id],
    );

    if (!userResult || userResult.length === 0) {
      console.error("❌ User not found");
    } else {
      const { email, name } = userResult[0];

      try {
        await transporter.sendMail({
          from: '"TravelYatra" <deepaktourandtravels970@gmail.com>',
          to: email,
          subject: "Booking Confirmed 🎉",
          html: `
        <div style="font-family: Arial, sans-serif; background-color: #f5f7fb; padding: 20px;">
    
        <div style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.1);">
      
      <div style="background: #4f46e5; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">🎉 Booking Confirmed</h1>
        <p style="margin: 5px 0 0;">Thank you for choosing us!</p>
      </div>

      <div style="padding: 25px;">
        <h2 style="color: #333;">Hi ${name},</h2>

        <p style="color: #555; line-height: 1.6;">
          Your travel booking has been successfully confirmed. We’re excited to have you on this journey!
        </p>

        <div style="background: #f9fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #4f46e5;">Booking Details</h3>
          
          <p><strong>Package:</strong> ${title}</p>
          <p><strong>Travel Date:</strong> ${travel_date}</p>
          <p><strong>Number of Persons:</strong> ${persons}</p>
          <p><strong>Total Amount Paid:</strong> ₹${total_amount}</p>
        </div>

        <p style="color: #555;">
          📌 Please carry a valid ID proof during your trip.  
          📌 Reach the pickup point at least 30 minutes early.
        </p>

        <div style="text-align: center; margin: 25px 0;">
          <a href="#" style="
            background: #4f46e5;
            color: #fff;
            padding: 12px 20px;
            border-radius: 6px;
            text-decoration: none;
            font-weight: bold;
          ">
            View Booking Details
          </a>
        </div>

        <p style="color: #555;">
          If you have any questions, feel free to contact our support team.
        </p>

        <p style="margin-top: 30px;">
          Regards,<br />
          <strong>TravelYatra</strong>
        </p>
      </div>

      <div style="background: #f1f1f1; padding: 15px; text-align: center; font-size: 12px; color: #777;">
        <p style="margin: 0;">© 2026 TravelYatra. All rights reserved.</p>
        <p style="margin: 5px 0 0;">Dehradun, Uttarakhand, India</p>
      </div>

    </div>
  </div>
`,
        });

        console.log("✅ Email sent successfully");
      } catch (err) {
        console.error("❌ Email failed:", err.message);
      }
    }

    return res.json({
      success: true,
      message: "Booking successful",
      booking_id,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: error.message,
    });
  }
};

//USER BOOKINGS
const getUserBookings = async (req, res) => {
  const user_id = req.user.id;

  try {
    const [result] = await my_db.query(
      `SELECT b.*, p.title
       FROM bookings b
       JOIN packages p ON b.package_id = p.id
       ORDER BY b.created_at DESC;
      `,
      [user_id],
    );

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch bookings",
      error: error.message,
    });
  }
};

const getPaymetDetail = async (req, res) => {
  try {
    const [result] = await my_db.query(`SELECT * FROM payments`);
    if (result.length === 0) {
      res.status(404).json({ message: "Paymet not found" });
    }
    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch booking",
      error: error.message,
    });
  }
};

export default {
  createOrder,
  verifyPayment,
  getUserBookings,
  getPaymetDetail,
};
