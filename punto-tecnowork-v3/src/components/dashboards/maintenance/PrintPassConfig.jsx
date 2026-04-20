import { useState, useEffect } from 'react';
import { databases } from '../../../lib/appwrite';
import { Query, ID } from 'appwrite';
import toast from 'react-hot-toast';
import {
    ShieldCheck, ChevronDown, ChevronUp, Printer, 
    Loader2, ToggleRight, ToggleLeft, CheckCircle2, Save
} from 'lucide-react';
import { AuditService } from '../../../lib/auditService';

const POLICY_DEFAULT = `POLÍTICA DE USO — PrintPass™

1. PERSONAL E INTRANSFERIBLE
El PrintPass™ está vinculado exclusivamente a la cuenta del titular. Queda prohibida su cesión, transferencia o uso por terceros bajo cualquier modalidad.

2. SUCURSAL ÚNICA
El saldo solo puede utilizarse en la sucursal donde fue activado. No es válido en otras sucursales de la red.

3. VIGENCIA
Cada PrintPass™ tiene una vigencia de 30 días desde su activación. El saldo no utilizado al vencimiento se pierde sin posibilidad de reintegro.

4. EXCEDENTE
Si una orden supera el saldo disponible, el excedente se factura a precio regular. Las unidades cubiertas por pack no generan cashback ni puntos de fidelidad.

5. CAUSALES DE REVOCACIÓN (sin reintegro de puntos)
El pack puede ser revocado y el usuario suspendido en los siguientes casos:
a) Uso de múltiples cuentas para acumular packs.
b) Préstamo o cesión de credenciales a terceros.
c) Declaración falsa de no recepción del pack para obtener duplicado.
d) Conducta inapropiada documentada por el operador del local.
e) Intento de uso en una sucursal no habilitada para el pack.

6. PROCEDIMIENTO DE SUSPENSIÓN
Toda revocación queda registrada con motivo y fecha. El usuario puede apelar abriendo un ticket en un plazo de 7 días.`;

export const PrintPassConfig = ({ onStatusChange }) => {
    const [ppDocId, setPpDocId] = useState(null);
    const [ppEnabled, setPpEnabled] = useState(false);
    const [ppLocations, setPpLocations] = useState([]);
    const [ppEnabledLocs, setPpEnabledLocs] = useState([]);
    const [ppPolicy, setPpPolicy] = useState(POLICY_DEFAULT);
    const [ppSaving, setPpSaving] = useState(false);
    const [ppLoading, setPpLoading] = useState(true);
    const [ppOpen, setPpOpen] = useState(true);
    const [initialEnabled, setInitialEnabled] = useState(false);

    const fetchPrintPass = async () => {
        try {
            setPpLoading(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const [ppRes, locsRes] = await Promise.all([
                databases.listDocuments(dbId, 'system_config', [
                    Query.equal('type', 'printpass_config')
                ]),
                databases.listDocuments(dbId, 'printing_locations', [
                    Query.equal('status', 'activo'), Query.limit(50)
                ])
            ]);
            setPpLocations(locsRes.documents);
            if (ppRes.documents.length > 0) {
                const doc = ppRes.documents[0];
                const data = JSON.parse(doc.data);
                setPpDocId(doc.$id);
                setPpEnabled(data.enabled ?? false);
                setInitialEnabled(data.enabled ?? false);
                setPpEnabledLocs(data.enabled_locations ?? []);
                setPpPolicy(data.policy ?? POLICY_DEFAULT);
                onStatusChange?.(true, data.enabled, (data.enabled_locations ?? []).length);
            } else {
                onStatusChange?.(false, false, 0);
            }
        } catch (e) {
            console.error(e);
            onStatusChange?.(false, false, 0);
        } finally {
            setPpLoading(false);
        }
    };

    useEffect(() => { fetchPrintPass(); }, []);

    const toggleLocation = (locId) => {
        setPpEnabledLocs(prev =>
            prev.includes(locId) ? prev.filter(id => id !== locId) : [...prev, locId]
        );
    };

    const handleSavePrintPass = async () => {
        try {
            setPpSaving(true);
            const dbId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
            const data = JSON.stringify({
                enabled: ppEnabled,
                enabled_locations: ppEnabledLocs,
                policy: ppPolicy,
            });
            if (ppDocId) {
                await databases.updateDocument(dbId, 'system_config', ppDocId, { data });
            } else {
                const doc = await databases.createDocument(dbId, 'system_config', ID.unique(), {
                    type: 'printpass_config', data
                });
                setPpDocId(doc.$id);
            }

            const toggleChanged = ppEnabled !== initialEnabled;
            await AuditService.logAction({
                action: toggleChanged ? 'printpass_toggle' : 'printpass_config_update',
                entityType: 'printpass',
                metadata: { 
                    description: toggleChanged 
                        ? `Módulo PrintPass™ ${ppEnabled ? 'activado' : 'desactivado'} globalmente`
                        : `Actualizó configuración de PrintPass™ (${ppEnabledLocs.length} locales)`,
                    enabled: ppEnabled,
                    enabled_locations_count: ppEnabledLocs.length
                }
            });

            setInitialEnabled(ppEnabled);
            onStatusChange?.(true, ppEnabled, ppEnabledLocs.length);
            toast.success('Configuración PrintPass™ guardada');
        } catch {
            toast.error('Error al guardar PrintPass™');
        } finally {
            setPpSaving(false);
        }
    };

    const activeLocCount = ppEnabledLocs.length;

    return (
        <div className="bg-card/50 backdrop-blur-xl border border-primary/20 rounded-2xl overflow-hidden shadow-glow">
            <button
                onClick={() => setPpOpen(o => !o)}
                className="w-full flex items-center justify-between p-6 hover:bg-white/3 transition">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                        <Printer size={20} className="text-primary" />
                    </div>
                    <div className="text-left">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">PrintPass™</h2>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border ${
                                ppEnabled
                                    ? 'bg-success/10 text-success border-success/20'
                                    : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                            }`}>
                                {ppEnabled ? `Activo · ${activeLocCount} local(es)` : 'Inactivo'}
                            </span>
                        </div>
                        <p className="text-gray-500 text-xs mt-0.5">Módulo de packs de impresiones canjeables por puntos</p>
                    </div>
                </div>
                {ppOpen ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
            </button>

            {ppOpen && (
                <div className="px-6 pb-6 space-y-6 border-t border-white/5">
                    {ppLoading ? (
                        <div className="flex justify-center py-10 text-primary"><Loader2 className="animate-spin" /></div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between pt-4">
                                <div>
                                    <p className="text-white font-black uppercase tracking-wider text-sm">Estado del módulo</p>
                                    <p className="text-gray-500 text-xs mt-0.5">
                                        {ppEnabled
                                            ? 'El módulo está activo. Los locales seleccionados pueden operar PrintPass™.'
                                            : 'El módulo está desactivado globalmente. No afecta a ningún local.'}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setPpEnabled(v => !v)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-sm uppercase transition border ${
                                        ppEnabled
                                            ? 'bg-success/10 border-success/30 text-success hover:bg-success/20'
                                            : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                    }`}>
                                    {ppEnabled
                                        ? <><ToggleRight size={18} /> Activo</>
                                        : <><ToggleLeft size={18} /> Inactivo</>
                                    }
                                </button>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                        Sucursales habilitadas para PrintPass™
                                    </p>
                                    <span className="text-[10px] text-gray-600">
                                        {activeLocCount} de {ppLocations.length} seleccionadas
                                    </span>
                                </div>

                                {ppLocations.length === 0 ? (
                                    <div className="text-center py-6 text-gray-600 text-sm border border-white/5 rounded-xl">
                                        No hay sucursales activas disponibles.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {ppLocations.map(loc => {
                                            const isOn = ppEnabledLocs.includes(loc.$id);
                                            return (
                                                <button
                                                    key={loc.$id}
                                                    onClick={() => toggleLocation(loc.$id)}
                                                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                                                        isOn
                                                            ? 'bg-primary/10 border-primary/30 text-white'
                                                            : 'bg-white/3 border-white/8 text-gray-500 hover:border-white/20'
                                                    }`}>
                                                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition ${
                                                        isOn ? 'bg-primary border-primary' : 'border-gray-600'
                                                    }`}>
                                                        {isOn && <CheckCircle2 size={10} className="text-white" />}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="text-sm font-black truncate">{loc.name}</p>
                                                        <p className="text-[10px] text-gray-500 truncate">{loc.address}</p>
                                                    </div>
                                                    {isOn && (
                                                        <span className="ml-auto shrink-0 text-[9px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20 uppercase">
                                                            ON
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <ShieldCheck size={14} className="text-primary" />
                                    <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">
                                        Política de uso visible para todos los usuarios
                                    </p>
                                </div>
                                <textarea
                                    rows={12}
                                    value={ppPolicy}
                                    onChange={e => setPpPolicy(e.target.value)}
                                    style={{
                                        backgroundColor: '#111118',
                                        color: '#d1d5db',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '16px',
                                        padding: '16px 18px',
                                        width: '100%',
                                        fontSize: '12px',
                                        fontFamily: 'monospace',
                                        lineHeight: '1.7',
                                        outline: 'none',
                                        resize: 'vertical',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    onClick={handleSavePrintPass}
                                    disabled={ppSaving}
                                    className="flex items-center gap-2 bg-primary hover:bg-primary-glow text-white px-6 py-3 rounded-xl font-black uppercase text-sm shadow-glow transition disabled:opacity-40">
                                    {ppSaving
                                        ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
                                        : <><Save size={16} /> Guardar configuración PrintPass™</>
                                    }
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
