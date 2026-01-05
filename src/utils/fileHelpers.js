/* src/utils/fileHelpers.js */
export const isBinaryFile = (filename) => {
    if (!filename) return false;
    const ext = filename.split('.').pop().toLowerCase();
    const binaryExts = [
        'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'ico',
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
        'zip', 'rar', '7z', 'tar', 'gz', 'apk', 'ipa',
        'mp3', 'wav', 'mp4', 'avi', 'mkv', 'mov',
        'eot', 'ttf', 'woff', 'woff2', 'class', 'dex', 'so'
    ];
    return binaryExts.includes(ext);
};