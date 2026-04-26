require('dotenv').config();
const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Supabase setup
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'placeholder_key';
const supabase = createClient(supabaseUrl, supabaseKey);

// Nodemailer setup
const transporter = nodemailer.createTransport({
    service: 'gmail', // or your preferred service
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files (the frontend)
app.use(express.static(path.join(__dirname)));

// Contact API Endpoint
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, phone, requirements, _honey } = req.body;

        // Honeypot check for bots
        if (_honey) {
            return res.status(400).json({ message: 'Bot detected' });
        }

        // Basic validation
        if (!name || !email || !requirements) {
            return res.status(400).json({ message: 'Please fill in all required fields.' });
        }

        let dbSuccess = false;

        // 1. Insert into Supabase
        if (process.env.SUPABASE_URL && process.env.SUPABASE_URL !== 'your_supabase_url_here') {
            const { data, error } = await supabase
                .from('leads')
                .insert([
                    { name, email, phone, requirements }
                ]);

            if (error) {
                console.error('Supabase error:', error);
                // Continue anyway to try sending email
            } else {
                dbSuccess = true;
            }
        }

        // 2. Send Email Notification
        if (process.env.EMAIL_USER && process.env.EMAIL_USER !== 'your_email@gmail.com') {
            const mailOptions = {
                from: process.env.EMAIL_USER,
                to: process.env.EMAIL_TO || process.env.EMAIL_USER,
                subject: `New Lead from ${name}`,
                html: `
                    <h3>New Lead Details</h3>
                    <p><strong>Name:</strong> ${name}</p>
                    <p><strong>Email:</strong> ${email}</p>
                    <p><strong>Phone:</strong> ${phone || 'N/A'}</p>
                    <p><strong>Requirements:</strong><br>${requirements}</p>
                `
            };

            transporter.sendMail(mailOptions, (mailErr, info) => {
                if (mailErr) {
                    console.error('Email error:', mailErr);
                } else {
                    console.log('Email sent:', info.response);
                }
            });
        }

        res.status(200).json({ message: 'Success! Your details have been received.' });

    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Fallback to index if needed
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'nexora_motions.html'));
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
