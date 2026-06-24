class LCXFileLoader {
    static async downloadInChunks(response, progressCallback = null) {
        const reader = response.body.getReader();
        const chunks = [];
        let receivedLength = 0;
        const contentLength = response.headers.get('content-length');
        const totalSize = contentLength ? parseInt(contentLength) : 0;
        let progressStep = 20;

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                receivedLength += value.length;
                if (totalSize > 0) {
                    const currentProgress = Math.floor((receivedLength / totalSize) * 75) + 20;
                    if (currentProgress >= progressStep) {
                        progressCallback?.(1, currentProgress,
                            `Скачано: ${Math.round(receivedLength / 1024)} KB / ${Math.round(totalSize / 1024)} KB`);
                        progressStep += 5;
                    }
                } else if (receivedLength % (50 * 1024) < value.length) {
                    progressCallback?.(1, Math.min(95, 20 + (receivedLength / 1024) * 0.1),
                        `Скачано: ${Math.round(receivedLength / 1024)} KB`);
                }
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            const result = new Uint8Array(receivedLength);
            let position = 0;
            for (const chunk of chunks) {
                result.set(chunk, position);
                position += chunk.length;
            }
            return result;
        } finally {
            reader.releaseLock();
        }
    }

    static async decompressGzip(compressedData, progressCallback = null) {
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();

        writer.write(compressedData);
        writer.close();

        const chunks = [];
        let totalDecompressed = 0;
        let progressStep = 10;

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            chunks.push(value);
            totalDecompressed += value.length;
            const currentProgress = Math.min(95, 10 + (totalDecompressed / 1024) * 0.1);
            if (currentProgress >= progressStep) {
                progressCallback?.(2, currentProgress,
                    `Распаковано: ${Math.round(totalDecompressed / 1024)} KB`);
                progressStep += 5;
            }
            await new Promise(resolve => setTimeout(resolve, 5));
        }

        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
        const result = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
            result.set(chunk, offset);
            offset += chunk.length;
        }
        return new TextDecoder().decode(result);
    }
}
