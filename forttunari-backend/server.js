// ============================================================
// Backend Forttunari Músicas — Extração de áudio YouTube
// Usa yt-dlp para extrair stream de áudio direto
// ============================================================

const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const cors = require('cors');
const path = require('path');

const execAsync = promisify(exec);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ── Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Backend Forttunari está funcionando!' });
});

// ── Endpoint para obter URL de áudio
app.get('/audio/:videoId', async (req, res) => {
  const { videoId } = req.params;

  // Validar ID (deve ser 11 caracteres alpanuméricos)
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'ID de vídeo inválido' });
  }

  try {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Comando yt-dlp para extrair melhor stream de áudio
    // -f best[ext=m4a] tenta pegar melhor qualidade em m4a
    // -g retorna apenas a URL do stream (não baixa)
    const command = `yt-dlp -f "bestaudio[ext=m4a]/bestaudio" -g "${youtubeUrl}"`;

    const { stdout, stderr } = await execAsync(command, {
      timeout: 15000,
      maxBuffer: 10 * 1024 * 1024,
    });

    if (stderr && !stdout) {
      console.error('yt-dlp error:', stderr);
      return res.status(404).json({ error: 'Vídeo não encontrado ou indisponível' });
    }

    const audioUrl = stdout.trim().split('\n')[0]; // Primeira linha é a URL

    if (!audioUrl || !audioUrl.startsWith('http')) {
      return res.status(500).json({ error: 'Erro ao extrair áudio' });
    }

    // Retornar a URL do stream
    res.json({
      success: true,
      videoId,
      audioUrl,
      message: 'Use esta URL no MTA com /setradio'
    });

  } catch (error) {
    console.error('Erro:', error.message);
    
    // Erros comuns
    if (error.message.includes('timeout')) {
      return res.status(408).json({ error: 'Timeout — vídeo demorou muito' });
    }
    if (error.message.includes('not found')) {
      return res.status(404).json({ error: 'Vídeo não encontrado' });
    }

    res.status(500).json({ error: 'Erro ao processar vídeo' });
  }
});

// ── Endpoint alternativo que redireciona direto pro áudio
app.get('/stream/:videoId', async (req, res) => {
  const { videoId } = req.params;

  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'ID de vídeo inválido' });
  }

  try {
    const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const command = `yt-dlp -f "bestaudio[ext=m4a]/bestaudio" -g "${youtubeUrl}"`;

    const { stdout } = await execAsync(command, { timeout: 15000 });
    const audioUrl = stdout.trim().split('\n')[0];

    // Redireciona direto para o stream (útil para alguns players)
    res.redirect(audioUrl);

  } catch (error) {
    res.status(500).json({ error: 'Erro ao extrair áudio' });
  }
});

// ── Página de status (opcional)
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Forttunari Backend</title>
      <style>
        body { font-family: Arial; background: #090909; color: #e0e0e0; padding: 2rem; }
        .container { max-width: 600px; margin: 0 auto; }
        h1 { color: #bbb; }
        code { background: #1a1a1a; padding: .25rem .5rem; border-radius: 3px; }
        .endpoint { background: #111; border: 1px solid #2a2a2a; padding: 1rem; margin: 1rem 0; border-radius: 3px; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🎵 Forttunari Backend</h1>
        <p>Backend de extração de áudio para MTA Músicas</p>

        <h2>Endpoints</h2>

        <div class="endpoint">
          <h3>GET /health</h3>
          <p>Verifica se o servidor está online</p>
          <code>GET /health</code>
        </div>

        <div class="endpoint">
          <h3>GET /audio/:videoId</h3>
          <p>Retorna a URL do áudio em JSON</p>
          <code>GET /audio/dQw4w9WgXcQ</code>
          <p><strong>Resposta:</strong></p>
          <code>{ "audioUrl": "https://...", "videoId": "..." }</code>
        </div>

        <div class="endpoint">
          <h3>GET /stream/:videoId</h3>
          <p>Redireciona direto para o stream de áudio</p>
          <code>GET /stream/dQw4w9WgXcQ</code>
        </div>

        <h2>Uso no MTA</h2>
        <code>/setradio https://seu-backend.railway.app/stream/VIDEO_ID</code>

        <h2>Status</h2>
        <p>✅ Backend rodando na porta ${PORT}</p>
      </div>
    </body>
    </html>
  `);
});

// ── Error handler
app.use((err, req, res, next) => {
  console.error('Erro:', err);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

// ── Start server
app.listen(PORT, () => {
  console.log(`🎵 Forttunari Backend rodando em http://localhost:${PORT}`);
  console.log(`📡 Endpoints:`);
  console.log(`   /health — verificar status`);
  console.log(`   /audio/:videoId — retorna JSON com URL do áudio`);
  console.log(`   /stream/:videoId — redireciona pro stream`);
});
