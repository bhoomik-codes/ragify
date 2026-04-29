export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_FILE_SIZE_MB: 10,
  MIME_TYPES: {
    'text/plain': ['.txt'],
    'text/markdown': ['.md'],
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/csv': ['.csv'],
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
  } as Record<string, string[]>,
  
  // Helper to get all allowed extensions flat
  getAllowedExtensions: () => {
    return Object.values(UPLOAD_CONFIG.MIME_TYPES).flat();
  },
  
  // Helper to get HTML accept string for inputs (e.g. ".txt,.md,.pdf")
  getAcceptString: () => {
    return Object.values(UPLOAD_CONFIG.MIME_TYPES).flat().join(',');
  }
};
