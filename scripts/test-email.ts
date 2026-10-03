import { Resend } from "resend";
import * as dotenv from "dotenv";
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

async function test() {
    console.log("Using API Key:", process.env.RESEND_API_KEY?.slice(0, 10) + "...");

    try {
        const { data, error } = await resend.emails.send({
            from: "Test <quotes@alphamc.pro>",
            to: ["team@slict.lk"], // Sending to self for test
            subject: "Verification Test",
            html: "<p>Test</p>"
        });

        if (error) {
            console.log("❌ Resend Error Details:");
            console.log(JSON.stringify(error, null, 2));
        } else {
            console.log("✅ Email sent successfully! ID:", data?.id);
        }
    } catch (e) {
        console.error("💥 Critical Exception:", e);
    }
}

test();
