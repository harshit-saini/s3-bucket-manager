export const AWS_REGIONS = [
  'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
  'af-south-1', 'ap-east-1', 'ap-south-1', 'ap-south-2',
  'ap-southeast-1', 'ap-southeast-2', 'ap-southeast-3', 'ap-southeast-4',
  'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3',
  'ca-central-1', 'ca-west-1',
  'eu-central-1', 'eu-central-2', 'eu-west-1', 'eu-west-2', 'eu-west-3',
  'eu-south-1', 'eu-south-2', 'eu-north-1',
  'il-central-1', 'me-south-1', 'me-central-1',
  'sa-east-1',
];

export const FILE_TYPE_MAP = {
  // Images
  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image',
  webp: 'image', svg: 'image', bmp: 'image', ico: 'image', avif: 'image',
  // Videos
  mp4: 'video', webm: 'video', mov: 'video', avi: 'video',
  mkv: 'video', flv: 'video', wmv: 'video',
  // Audio
  mp3: 'audio', wav: 'audio', ogg: 'audio', flac: 'audio',
  aac: 'audio', wma: 'audio', m4a: 'audio',
  // Documents
  pdf: 'pdf', doc: 'document', docx: 'document',
  xls: 'spreadsheet', xlsx: 'spreadsheet', csv: 'spreadsheet',
  ppt: 'presentation', pptx: 'presentation',
  // Text/Code
  txt: 'text', md: 'text', json: 'text', xml: 'text',
  js: 'code', jsx: 'code', ts: 'code', tsx: 'code',
  py: 'code', java: 'code', c: 'code', cpp: 'code',
  h: 'code', cs: 'code', go: 'code', rs: 'code',
  rb: 'code', php: 'code', swift: 'code', kt: 'code',
  html: 'code', css: 'code', scss: 'code', less: 'code',
  sql: 'code', sh: 'code', bash: 'code', yml: 'code', yaml: 'code',
  toml: 'code', ini: 'code', env: 'code', log: 'text',
  // Archives
  zip: 'archive', rar: 'archive', '7z': 'archive',
  tar: 'archive', gz: 'archive', bz2: 'archive',
};

export const SHARE_EXPIRY_OPTIONS = [
  { label: '1 Hour', value: 3600 },
  { label: '6 Hours', value: 21600 },
  { label: '24 Hours', value: 86400 },
  { label: '3 Days', value: 259200 },
  { label: '7 Days', value: 604800 },
];

export const SORT_OPTIONS = [
  { label: 'Name (A-Z)', value: 'name-asc' },
  { label: 'Name (Z-A)', value: 'name-desc' },
  { label: 'Size (Smallest)', value: 'size-asc' },
  { label: 'Size (Largest)', value: 'size-desc' },
  { label: 'Date (Newest)', value: 'date-desc' },
  { label: 'Date (Oldest)', value: 'date-asc' },
];

export const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB minimum for S3 multipart

export const CREDENTIAL_STORAGE_KEY = 's3manager_credentials';
