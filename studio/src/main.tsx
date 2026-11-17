import { createRoot } from 'react-dom/client';
import { SlideStudioPreview } from './preview-app.js';
import './styles.css';

const target = document.getElementById('root');
if (!target) throw new Error('No se encontró la raíz del estudio');
createRoot(target).render(<SlideStudioPreview />);
