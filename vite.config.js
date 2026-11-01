import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function uhriSimulationApiPlugin() {
  let latestSimulationState = {
    timestamp: Date.now(),
    sectorId: 'SEC-G1',
    uhri: 0.88,
    tier: {
      id: 'RED',
      name: 'Danger (Imminent Failure)',
      colorHex: '#ef4444',
      citizenDirectives: [
        'LIFE SAFETY EMERGENCY: EVACUATE IMMEDIATELY TO DESIGNATED HIGH GROUND.'
      ]
    },
    sensors: {
      rainfall1h: 22.0,
      rainfall24h: 110.0,
      rainfall72h: 218.0,
      soilMoisture: 92.5,
      groundTilt: 3.42,
      porePressure: 48.0
    },
    terrain: {
      slopeAngle: 46.5
    }
  };

  let sseClients = [];

  return {
    name: 'uhri-simulation-api-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Enable CORS for mobile apps and other origins
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        const url = req.url ? req.url.split('?')[0] : '';

        // Route shortcut for mobile citizen view
        if (url === '/citizen') {
          res.writeHead(302, { Location: '/mobile-app.html' });
          res.end();
          return;
        }

        // Real-time Simulation State endpoint
        if (url === '/api/simulation/state') {
          if (req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body);
                latestSimulationState = {
                  ...latestSimulationState,
                  ...parsed,
                  timestamp: Date.now()
                };

                // Instant broadcast to connected mobile phones
                const eventPayload = `data: ${JSON.stringify(latestSimulationState)}\n\n`;
                sseClients.forEach((client) => {
                  try {
                    client.write(eventPayload);
                  } catch (e) {}
                });

                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, timestamp: latestSimulationState.timestamp }));
              } catch (err) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }

          if (req.method === 'GET') {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(latestSimulationState));
            return;
          }
        }

        // Live Server-Sent Events stream for mobile devices
        if (url === '/api/simulation/stream') {
          res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          });
          res.write(`data: ${JSON.stringify(latestSimulationState)}\n\n`);
          sseClients.push(res);
          req.on('close', () => {
            sseClients = sseClients.filter((c) => c !== res);
          });
          return;
        }

        next();
      });
    }
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    uhriSimulationApiPlugin()
  ],
  server: {
    host: true, // Listen on all network interfaces (0.0.0.0) so phone can connect via Wi-Fi
    port: 5173
  }
})
