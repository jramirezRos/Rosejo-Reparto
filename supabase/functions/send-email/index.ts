// Supabase Edge Function: send-email
// Deploy: npx supabase functions deploy send-email --project-ref <TU_PROJECT_REF>
// Secrets: GMAIL_USER, GMAIL_PASS (contraseña de aplicación)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Manejar preflight CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to_email, to_name, subject, message, from_name } = await req.json();

    if (!to_email || !subject || !message) {
      return new Response(
        JSON.stringify({ ok: false, error: "Faltan campos requeridos" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GMAIL_USER = Deno.env.get("GMAIL_USER") ?? "";
    const GMAIL_PASS = Deno.env.get("GMAIL_PASS") ?? "";

    if (!GMAIL_USER || !GMAIL_PASS) {
      return new Response(
        JSON.stringify({ ok: false, error: "Credenciales Gmail no configuradas" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Construir HTML del correo
    const htmlBody = message.replace(/\n/g, "<br>");
    const html = `
<html><body style="font-family:Arial,sans-serif;font-size:14px;color:#333;max-width:600px;margin:0 auto">
  <div style="background:#1a4731;padding:20px 24px;border-radius:8px 8px 0 0">
    <h2 style="color:#fff;margin:0;font-size:18px">🚚 ${from_name || "Rosejo Reparto"}</h2>
  </div>
  <div style="padding:24px;border:1px solid #e0e0e0;border-top:none;border-radius:0 0 8px 8px">
    <p style="margin:0 0 16px">${htmlBody}</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
    <p style="font-size:12px;color:#888;margin:0">Este correo fue enviado automáticamente por el sistema Rosejo Reparto.</p>
  </div>
</body></html>`;

    // Enviar vía Gmail SMTP usando SmtpClient de Deno
    const { SmtpClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
    const client = new SmtpClient();

    await client.connectTLS({
      hostname: "smtp.gmail.com",
      port: 465,
      username: GMAIL_USER,
      password: GMAIL_PASS,
    });

    await client.send({
      from: `${from_name || "Rosejo Reparto"} <${GMAIL_USER}>`,
      to: to_email,
      subject: subject,
      content: message,
      html: html,
    });

    await client.close();

    console.log(`✅ Correo enviado a ${to_email}: ${subject}`);
    return new Response(
      JSON.stringify({ ok: true, to: to_email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("❌ Error:", err);
    return new Response(
      JSON.stringify({ ok: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
