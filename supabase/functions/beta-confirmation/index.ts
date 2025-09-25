import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BetaConfirmationRequest {
  name: string;
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email }: BetaConfirmationRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "Construyo <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to Constituyo Beta!",
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #22c55e; margin-bottom: 10px;">Welcome to Constituyo Beta!</h1>
            <p style="color: #666; font-size: 18px;">Thank you for joining our exclusive Beta program, ${name}!</p>
          </div>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-bottom: 15px;">What's Next?</h2>
            <ul style="color: #666; line-height: 1.6;">
              <li>You'll receive priority access to our AI-powered compliance platform</li>
              <li>Get exclusive updates about new features and improvements</li>
              <li>Direct access to our support team for feedback and questions</li>
              <li>Special beta pricing when we launch</li>
            </ul>
          </div>
          
          <div style="background: #22c55e; color: white; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
            <h3 style="margin-bottom: 10px;">Beta Access Coming Soon!</h3>
            <p style="margin: 0;">We'll notify you as soon as your beta access is ready. Keep an eye on your inbox!</p>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 14px;">
            <p>Questions? Reply to this email or contact us at beta@constituyo.com</p>
            <p style="margin-top: 20px;">
              <strong>Construyo Team</strong><br>
              AI-powered business compliance made simple
            </p>
          </div>
        </div>
      `,
    });

    console.log("Beta confirmation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in beta-confirmation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);