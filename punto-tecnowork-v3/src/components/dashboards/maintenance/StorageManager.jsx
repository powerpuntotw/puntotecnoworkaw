import { useState, useEffect } from 'react';
import { storage } from '../../../lib/appwrite';
import toast from 'react-hot-toast';
import { FileStack, Trash2 } from 'lucide-react';

export const StorageManager = ({ onFilesChange }) => {
    const [files, setFiles] = useState([]);

    const fetchFiles = async () => {
        try {
            const res = await storage.listFiles('orders_files');
            const filesList = res.files || [];
            setFiles(filesList);
            onFilesChange?.(filesList);
        } catch { 
            setFiles([]);
            onFilesChange?.([]);
        }
    };

    useEffect(() => { fetchFiles(); }, []);

    const handleDeleteFile = async (id) => {
        if (!window.confirm('¿Eliminar este archivo permanentemente?')) return;
        try {
            await storage.deleteFile('orders_files', id);
            const newList = files.filter(f => f.$id !== id);
            setFiles(newList);
            onFilesChange?.(newList);
            toast.success('Archivo eliminado');
        } catch { 
            toast.error('Error al eliminar'); 
        }
    };

    if (files.length === 0) return null;

    return (
        <div className="bg-card/50 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-glow">
            <div className="flex justify-between items-center mb-5">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <FileStack className="text-primary" size={20} /> Archivos de Órdenes
                </h2>
                <span className="text-xs text-gray-500">{files.length} archivos</span>
            </div>
            <div className="max-h-80 overflow-y-auto border border-white/5 rounded-xl">
                <table className="w-full text-left">
                    <thead className="sticky top-0 bg-background/90 backdrop-blur">
                        <tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-white/10">
                            <th className="p-3 font-medium">Archivo</th>
                            <th className="p-3 font-medium">Tamaño</th>
                            <th className="p-3 font-medium">Fecha</th>
                            <th className="p-3 font-medium text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {files.map(file => (
                            <tr key={file.$id} className="hover:bg-white/5 transition">
                                <td className="p-3 text-sm text-white truncate max-w-[180px]">{file.name}</td>
                                <td className="p-3 text-sm text-gray-400">{(file.sizeOriginal / 1024).toFixed(1)} KB</td>
                                <td className="p-3 text-sm text-gray-400">{new Date(file.$createdAt).toLocaleDateString()}</td>
                                <td className="p-3 text-right">
                                    <button onClick={() => handleDeleteFile(file.$id)} 
                                        className="p-1.5 text-red-400 hover:bg-red-400/10 rounded-lg transition">
                                        <Trash2 size={14} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
