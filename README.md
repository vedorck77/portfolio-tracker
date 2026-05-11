# 📊 Portfolio Tracker — Plan 20 años

Dashboard personal de seguimiento de cartera con plan a 20 años, benchmarks IPSA y S&P 500, simulador de rotación, tracking de dividendos y proyecciones de interés compuesto.

**100% privado** — tus datos viven en el `localStorage` de tu navegador. No hay backend, no hay servidor, nadie ve tu cartera.

## ✨ Características

- **Dashboard** con métricas separadas Chile / EE.UU. / Total
- **Cartera** editable con soporte para acciones, ETFs, REITs
- **Dividendos** estimados con yield por posición y proyección a 20 años
- **Rotación** simulador para probar "vender X → comprar Y" antes de ejecutar
- **Benchmark** vs IPSA, S&P 500 y Nasdaq 100 con datos históricos reales
- **Proyección** interactiva de crecimiento con interés compuesto
- **Alertas** automáticas de redundancias, concentración sectorial, bajo rendimiento
- **PWA instalable** — funciona offline, se instala en celular/PC como app nativa
- **Backup/Restore JSON** para guardar respaldos seguros de tu cartera
- **Exportación CSV** para análisis externo

## 🚀 Deploy en GitHub Pages (gratis, ~10 minutos)

### Paso 1: Crea el repositorio

1. Crea cuenta en [GitHub](https://github.com) si no tienes.
2. Click en **New repository** (botón verde arriba a la derecha).
3. Nombre: `portfolio-tracker` (o el que prefieras).
4. Visibilidad: **Public** (necesario para GitHub Pages gratis) o **Private** si tienes plan paid.
5. **NO** marques "Add a README" (ya tienes uno).
6. Click **Create repository**.

### Paso 2: Sube los archivos

**Opción A — Drag & drop (la fácil):**
1. En la página de tu repo vacío, click **uploading an existing file**.
2. Arrastra estos archivos: `index.html`, `app.js`, `manifest.json`, `service-worker.js`, `icon.svg`, `icon-192.png`, `icon-512.png`, `README.md`.
3. Click **Commit changes**.

**Opción B — Git desde terminal:**
```bash
cd portfolio-tracker
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/portfolio-tracker.git
git push -u origin main
```

### Paso 3: Activa GitHub Pages

1. En tu repo, ve a **Settings** (engranaje arriba).
2. En el menú izquierdo, click **Pages**.
3. En **Source**, elige **Deploy from a branch**.
4. Branch: **main**, folder: **/ (root)**.
5. Click **Save**.
6. Espera 1-2 minutos. GitHub te dará una URL como `https://TU-USUARIO.github.io/portfolio-tracker/`.

### Paso 4: Accede desde tu celular

1. Abre la URL en Safari (iOS) o Chrome (Android).
2. **Android Chrome**: aparecerá un banner "Instalar app". Toca y listo.
3. **iOS Safari**: toca el botón **Compartir** → **Añadir a pantalla de inicio**.

Ya tienes tu app instalada con ícono propio, funcionando offline, sincronizando con tu cuenta de Google/iCloud según corresponda.

## 🔧 Uso local sin deploy

Si solo quieres usarlo en tu PC sin subirlo a internet:

1. Descarga todos los archivos a una carpeta.
2. Abre `index.html` con doble click.
3. Listo. Funciona igual, datos solo en tu PC.

⚠️ Algunas features PWA (instalación, service worker) requieren HTTPS y no funcionarán con `file://`. Para probar localmente con servidor:
```bash
# Python 3 (si lo tienes instalado)
cd portfolio-tracker
python3 -m http.server 8000
# Luego abre http://localhost:8000
```

## 📂 Estructura del proyecto

```
portfolio-tracker/
├── index.html          # Estructura y estilos
├── app.js              # Lógica completa de la app
├── manifest.json       # PWA manifest (instalabilidad)
├── service-worker.js   # Cache + offline support
├── icon.svg            # Ícono vectorial principal
├── icon-192.png        # Ícono PWA Android
├── icon-512.png        # Ícono PWA splash screen
└── README.md           # Este archivo
```

## ⚠️ Importante: privacidad y backups

**Tus datos viven solo en este navegador, en este dispositivo.** Si:
- Limpias caché/cookies → se borran
- Cambias de navegador → no se sincronizan
- Cambias de teléfono → empiezas de cero

**Solución:** usa el botón **"Backup JSON"** en la pestaña Cartera regularmente. Guarda el archivo en Google Drive/iCloud. Para restaurar, usa **"Restaurar"** en otra instalación.

## 🔄 Actualizaciones

Para actualizar el código:
1. Edita archivos localmente.
2. `git add . && git commit -m "Update" && git push` (o re-upload por web).
3. GitHub Pages despliega automáticamente en 1-2 minutos.
4. En la app abierta, recarga (Ctrl+Shift+R) para evitar caché del service worker.

## 🛠️ Personalización rápida

**Cambiar tipo de cambio CLP/USD**: edita `app.js`, línea `const USD_CLP = 950`.

**Agregar más tickers con yield conocido**: edita el objeto `yields` en `app.js`.

**Cambiar benchmarks**: edita el objeto `benchmarks` en `app.js`. Por defecto uso retornos anualizados promedio.

**Cambiar color de marca**: edita `--accent` en `index.html` (verde por defecto) y `theme_color` en `manifest.json`.

**Modificar la cartera por defecto** (la que aparece al hacer Reset): edita el array `defaultPortfolio` en `app.js`.

## 📜 Disclaimer

Esta herramienta es para uso personal y educativo. No constituye asesoría financiera. Los datos de benchmarks y yields son estimaciones basadas en fuentes públicas y pueden no ser precisos. Para decisiones de inversión consulta con un asesor financiero certificado.

## 📝 Licencia

MIT — úsalo, modifícalo, compártelo libremente.
