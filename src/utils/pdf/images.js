// Resolve URL images once per export. No persistent cache: retrying an export
// also retries failed or changed remote resources.
export async function prepareImages(tokens, { timeoutMs = 15000 } = {}) {
    const sources = [...new Set(tokens.flatMap(token => (token.children || [])
        .filter(child => child.type === 'image').map(child => child.attrGet('src') || '')))];
    const result = new Map();
    await Promise.all(sources.map(async source => {
        try {
            if (!/^https?:\/\//i.test(source)) throw new Error('仅支持完整的 HTTP(S) 图片 URL');
            const url = new URL(source);
            if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) {
                throw new Error('仅支持不含账号密码的 HTTP(S) 图片 URL');
            }
            result.set(source, await loadImage(url.href, timeoutMs));
        } catch (error) {
            result.set(source, { error: error.message || '图片加载失败' });
        }
    }));
    return result;
}

async function loadImage(url, timeoutMs) {
    const controller = new AbortController();
    let timer;
    let bitmap;
    const job = async () => {
        const response = await fetch(url, { mode: 'cors', credentials: 'omit', signal: controller.signal });
        if (!response.ok) throw new Error(`图片请求失败（HTTP ${response.status}）`);
        const blob = await response.blob();
        const signature = new Uint8Array(await blob.slice(0, 8).arrayBuffer());
        const png = [137, 80, 78, 71, 13, 10, 26, 10].every((byte, i) => signature[i] === byte);
        const jpeg = signature[0] === 255 && signature[1] === 216 && signature[2] === 255;
        if (!png && !jpeg) throw new Error('暂仅支持 PNG/JPEG 图片');
        bitmap = await createImageBitmap(blob);
        if (controller.signal.aborted) { bitmap.close(); return; }
        const { width, height } = bitmap;
        if (!width || !height || width * height > 40000000) throw new Error('图片尺寸无效或超过 4000 万像素');
        // Normalize decoded pixels to PNG so malformed image payloads cannot
        // fail later inside pdfmake, after the warning decision has been made.
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(bitmap, 0, 0);
        const data = canvas.toDataURL('image/png');
        if (!data.startsWith('data:image/png;base64,')) throw new Error('图片转换失败');
        return { data, width, height };
    };
    try {
        return await Promise.race([
            job(),
            new Promise((_, reject) => {
                timer = setTimeout(() => {
                    controller.abort();
                    reject(new Error('图片加载超时，请检查网络后重试'));
                }, timeoutMs);
            }),
        ]);
    } catch (error) {
        if (error instanceof TypeError) throw new Error('图片读取失败，请检查网络、图床 CORS 或防盗链设置', { cause: error });
        throw error;
    } finally {
        clearTimeout(timer);
        bitmap?.close();
    }
}
