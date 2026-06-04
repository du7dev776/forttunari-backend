#!/usr/bin/env python3
# ============================================================
# Backend Forttunari Músicas — Python com Flask
# Extração de áudio YouTube com yt-dlp
# ============================================================

from flask import Flask, jsonify, request
from flask_cors import CORS
import subprocess
import os
import json
import re

app = Flask(__name__)
CORS(app)

# ── Health check
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'message': 'Backend Forttunari está funcionando!'
    })

# ── Página inicial
@app.route('/', methods=['GET'])
def index():
    return '''
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
                <code>GET /health</code>
                <p>Status do servidor</p>
            </div>
            <div class="endpoint">
                <h3>GET /audio/:videoId</h3>
                <code>GET /audio/dQw4w9WgXcQ</code>
                <p>Retorna URL do áudio em JSON</p>
            </div>
            <div class="endpoint">
                <h3>GET /stream/:videoId</h3>
                <code>GET /stream/dQw4w9WgXcQ</code>
                <p>Redireciona direto para o áudio</p>
            </div>
            <h2>Status</h2>
            <p>✅ Backend rodando</p>
        </div>
    </body>
    </html>
    ''', 200, {'Content-Type': 'text/html; charset=utf-8'}

# ── Endpoint para obter URL de áudio
@app.route('/audio/<video_id>', methods=['GET'])
def get_audio(video_id):
    # Validar ID (deve ser 11 caracteres alpanuméricos)
    if not video_id or not re.match(r'^[a-zA-Z0-9_-]{11}$', video_id):
        return jsonify({'error': 'ID de vídeo inválido'}), 400

    try:
        youtube_url = f'https://www.youtube.com/watch?v={video_id}'
        
        # Comando yt-dlp para extrair melhor stream de áudio
        cmd = [
            'yt-dlp',
            '-f', 'bestaudio[ext=m4a]/bestaudio',
            '-g',
            youtube_url
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        
        if result.returncode != 0 or not result.stdout.strip():
            return jsonify({'error': 'Vídeo não encontrado ou indisponível'}), 404
        
        audio_url = result.stdout.strip().split('\n')[0]
        
        if not audio_url or not audio_url.startswith('http'):
            return jsonify({'error': 'Erro ao extrair áudio'}), 500
        
        return jsonify({
            'success': True,
            'videoId': video_id,
            'audioUrl': audio_url,
            'message': 'Use esta URL no MTA com /setradio'
        }), 200
        
    except subprocess.TimeoutExpired:
        return jsonify({'error': 'Timeout — vídeo demorou muito'}), 408
    except Exception as e:
        print(f'Erro: {str(e)}')
        return jsonify({'error': f'Erro ao processar vídeo: {str(e)}'}), 500

# ── Endpoint alternativo que redireciona direto pro áudio
@app.route('/stream/<video_id>', methods=['GET'])
def stream_audio(video_id):
    if not video_id or not re.match(r'^[a-zA-Z0-9_-]{11}$', video_id):
        return jsonify({'error': 'ID de vídeo inválido'}), 400

    try:
        youtube_url = f'https://www.youtube.com/watch?v={video_id}'
        cmd = [
            'yt-dlp',
            '-f', 'bestaudio[ext=m4a]/bestaudio',
            '-g',
            youtube_url
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        
        if result.returncode != 0:
            return jsonify({'error': 'Vídeo não encontrado'}), 404
        
        audio_url = result.stdout.strip().split('\n')[0]
        
        # Redireciona direto para o stream
        from flask import redirect
        return redirect(audio_url, code=302)
        
    except Exception as e:
        return jsonify({'error': 'Erro ao extrair áudio'}), 500

# ── Error handler
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint não encontrado'}), 404

@app.errorhandler(500)
def server_error(error):
    return jsonify({'error': 'Erro interno do servidor'}), 500

# ── Run
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3000))
    app.run(host='0.0.0.0', port=port, debug=False)
