import { createClient } from "@supabase/supabase-js";

// Ambient declaration so IDE TypeScript compilers don't complain about Deno globals
declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void;
  env: {
    get: (key: string) => string | undefined;
  };
};

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();

    // Verify it's an INSERT event
    if (payload.type !== "INSERT" || !payload.record) {
      return new Response(JSON.stringify({ error: "Invalid payload, expected INSERT event." }), { status: 400 });
    }

    const record = payload.record;
    
    // Check if the reading already has temp/humidity so we don't fetch redundantly
    if (record.temperature_c !== null && record.humidity_percent !== null) {
      return new Response(JSON.stringify({ message: "Weather already present." }), { status: 200 });
    }

    if (!record.device_id) {
      return new Response(JSON.stringify({ error: "No device_id in record." }), { status: 400 });
    }

    // Initialize Supabase Admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get device lat/lng
    const { data: device, error: deviceError } = await supabaseAdmin
      .from("ovitrap_devices")
      .select("latitude, longitude")
      .eq("id", record.device_id)
      .single();

    if (deviceError || !device || !device.latitude || !device.longitude) {
      return new Response(JSON.stringify({ error: "Device location not found." }), { status: 400 });
    }

    // Fetch weather from open-meteo
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${device.latitude}&longitude=${device.longitude}&current=temperature_2m,relative_humidity_2m`
    );
    
    if (!weatherRes.ok) {
       return new Response(JSON.stringify({ error: "Failed to fetch weather API." }), { status: 500 });
    }

    const weatherData = await weatherRes.json();
    
    const temp = weatherData.current?.temperature_2m;
    const hum = weatherData.current?.relative_humidity_2m;

    if (temp == null || hum == null) {
      return new Response(JSON.stringify({ error: "Invalid weather data returned." }), { status: 500 });
    }

    // Update the original reading
    const { error: updateError } = await supabaseAdmin
      .from("ovitrap_readings")
      .update({
        temperature_c: temp,
        humidity_percent: hum,
      })
      .eq("id", record.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), { status: 500 });
    }

    return new Response(
      JSON.stringify({
        success: true,
        temperature_c: temp,
        humidity_percent: hum,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
