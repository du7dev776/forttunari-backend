FROM node:18-bullseye

# Instalar Python3 e pip (necessário para yt-dlp)
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

# Instalar yt-dlp
RUN pip install yt-dlp

# Definir diretório de trabalho
WORKDIR /app

# Copiar package.json e package-lock.json
COPY package*.json ./

# Instalar dependências Node.js
RUN npm install

# Copiar código da aplicação
COPY server.js ./

# Expor porta
EXPOSE 3000

# Iniciar aplicação
CMD ["npm", "start"]
