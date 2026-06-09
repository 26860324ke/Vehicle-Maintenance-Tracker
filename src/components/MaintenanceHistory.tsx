import React, { useState } from 'react';
import { 
  History, Plus, Trash2, Calendar, FileText, Info, X, DollarSign, Gauge 
} from 'lucide-react';
import { useAppState } from '../context/AppContext';
import { formatDistance, getDistanceLabel, getDistanceUnit } from '../lib/units';
import { formatCurrencyValue } from '../lib/i18n';

const getLocalizedServiceType = (type: string, lang: string) => {
  if (lang !== 'zh-TW') return type;
  const map: Record<string, string> = {
    'Oil Change': '機油與油芯更換',
    'Tire Rotation': '輪胎對調與平衡',
    'Brake Pad Replacement': '煞車片更換',
    'Brake Fluid Flush': '煞車油更換',
    'Engine Cabin Filter': '引擎或冷氣濾網',
    'Spark Plug Upgrade': '火星塞升級與更換',
    'Timing Belt Renewal': '正時皮帶/皮帶更換',
    'Battery Inspection': '電瓶檢測與更換',
    'Transmission Fluid Flush': '變速箱油更換',
    'Coolant Refill': '水箱冷卻液補充/更換',
    'General Inspection': '常規全車檢查 / 診斷',
    'General Inspection / Diagnostic': '常規全車檢查 / 診斷',
    'Other Repair': '其他特定維修項目',
    'Other Specific Repair': '其他特定維修項目'
  };
  return map[type] || type;
};

interface MaintenanceHistoryProps {
  logs: any[];
  currentMileage: number;
  onAddLog: (data: {
    date: string;
    serviceType: string;
    cost: number;
    mileageAtService: number;
    notes: string;
  }) => Promise<void>;
  onDeleteLog: (id: string) => Promise<void>;
}

export default function MaintenanceHistory({
  logs,
  currentMileage,
  onAddLog,
  onDeleteLog,
}: MaintenanceHistoryProps) {
  const { unitPreference, currencyPreference, languagePreference, t } = useAppState();
  const [showFormModal, setShowFormModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteErrorText, setDeleteErrorText] = useState<string | null>(null);

  // Form states
  const [logDate, setLogDate] = useState(new Date().toISOString().split('T')[0]);
  const [logServiceType, setLogServiceType] = useState('Oil Change');
  const [customServiceType, setCustomServiceType] = useState('');
  const [logCost, setLogCost] = useState('');
  const [logMileage, setLogMileage] = useState(currentMileage.toString());
  const [logNotes, setLogNotes] = useState('');

  const handleOpenForm = () => {
    setErrorText(null);
    setLogMileage(currentMileage.toString());
    setLogDate(new Date().toISOString().split('T')[0]);
    setLogServiceType('Oil Change');
    setCustomServiceType('');
    setLogCost('');
    setLogNotes('');
    setShowFormModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    const actualServiceType = logServiceType === 'Other Repair' && customServiceType.trim()
      ? customServiceType.trim()
      : logServiceType;

    if (!logDate || !actualServiceType || !logCost || !logMileage) {
      setErrorText(languagePreference === 'zh-TW' ? '請填寫所有必要欄位：日期、保養項目、費用和里程。' : 'Please fill in all core fields: Date, Service, Cost, and Odometer.');
      return;
    }

    const costNum = Number(logCost);
    const milNum = Number(logMileage);

    if (isNaN(costNum) || costNum < 0) {
      setErrorText(languagePreference === 'zh-TW' ? '發票總費用不得低於零。' : 'Total Invoice Cost cannot be less than zero.');
      return;
    }
    if (isNaN(milNum) || milNum < 0) {
      setErrorText(languagePreference === 'zh-TW' ? '里程錶數值不得低於零。' : `Odometer (${getDistanceLabel(unitPreference)}) value cannot be less than zero.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddLog({
        date: logDate,
        serviceType: actualServiceType,
        cost: costNum,
        mileageAtService: milNum,
        notes: logNotes,
      });
      setShowFormModal(false);
    } catch (err: any) {
      setErrorText(err.message || (languagePreference === 'zh-TW' ? '無法送出保養紀錄。' : 'Failed to submit service log entry.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setDeleteErrorText(null);
    try {
      await onDeleteLog(id);
      setDeleteConfirmId(null);
    } catch (err: any) {
      setDeleteErrorText(err.message || (languagePreference === 'zh-TW' ? '無法刪除保養紀錄' : 'Could not delete service log'));
    }
  };

  return (
    <div id="maintenance-history-section" className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 space-y-4">
      {/* Header controls bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <History className="h-4.5 w-4.5 text-slate-500" />
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider font-sans">
            {languagePreference === 'zh-TW' ? '保養歷史日誌' : 'Maintenance Logs'}
          </h3>
        </div>
        <button
          id="btn-trigger-add-record"
          onClick={handleOpenForm}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs py-1.5 px-3 rounded-lg shadow-sm flex items-center space-x-1 cursor-pointer transition select-none"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>{languagePreference === 'zh-TW' ? '新增保養日誌' : 'Add Record'}</span>
        </button>
      </div>

      {/* Main List timeline or table */}
      {logs.length === 0 ? (
        <div className="py-12 text-center text-slate-400 space-y-2">
          <FileText className="h-10 w-10 mx-auto text-slate-300" />
          <p className="text-xs">{languagePreference === 'zh-TW' ? '目前尚無任何保養紀錄。' : 'No service items logged yet.'}</p>
          <p className="text-[11px] max-w-sm mx-auto text-slate-500 mt-1 leading-relaxed">
            {languagePreference === 'zh-TW' 
              ? '現在開始隨時登錄您隨車進行的機油保養、輪胎對調、煞車片更換，電瓶更換或其他特約保修保養紀錄。' 
              : 'Begin logging repairs like spark plug upgrades, cabin filters, engine checks, tire changes, or standard oil services.'}
          </p>
        </div>
      ) : (
        <div className="relative border-l-2 border-slate-100 ml-3.5 mt-2 space-y-6 pt-1 max-h-[500px] overflow-y-auto pr-1">
          {logs.map((log) => {
            if (deleteConfirmId === log.id) {
              return (
                <div key={log.id} id={`history-timeline-item-confirm-delete-${log.id}`} className="relative pl-6">
                  <div className="absolute -left-[7px] top-1.5 bg-red-100 rounded-full border-4 border-white h-3.5 w-3.5 shrink-0" />
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 transition space-y-3">
                    <div className="flex flex-col space-y-1">
                      <p className="font-bold text-red-900 text-xs">
                        {languagePreference === 'zh-TW' 
                          ? `確定刪除「${getLocalizedServiceType(log.serviceType, languagePreference)}」保養紀錄嗎？` 
                          : `Are you sure you want to permanently delete the log: "${getLocalizedServiceType(log.serviceType, languagePreference)}"?`}
                      </p>
                      {deleteErrorText && (
                        <p className="text-[10px] text-red-700 font-semibold">{deleteErrorText}</p>
                      )}
                    </div>
                    <div className="flex justify-end space-x-2 font-semibold">
                      <button
                        onClick={() => {
                          setDeleteConfirmId(null);
                          setDeleteErrorText(null);
                        }}
                        className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-[10px] hover:bg-slate-100 cursor-pointer font-bold"
                      >
                        {languagePreference === 'zh-TW' ? '取消' : 'Cancel'}
                      </button>
                      <button
                        onClick={() => handleDelete(log.id, log.serviceType)}
                        className="px-2.5 py-1.5 bg-red-650 text-white rounded-lg text-[10px] hover:bg-red-750 cursor-pointer font-bold"
                      >
                        {languagePreference === 'zh-TW' ? '確認刪除' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={log.id} id={`history-timeline-item-${log.id}`} className="relative pl-6 group">
              {/* Decorative Timeline Bullet Point */}
              <div className="absolute -left-[7px] top-1.5 bg-blue-100 rounded-full border-4 border-white h-3.5 w-3.5 shrink-0 transition group-hover:bg-blue-500" />

              <div className="bg-slate-50 hover:bg-slate-100/70 rounded-xl p-4 transition space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{getLocalizedServiceType(log.serviceType, languagePreference)}</h4>
                    <p className="text-slate-500 text-[11px] font-mono mt-0.5">
                      {log.date} — {formatDistance(log.mileageAtService, unitPreference)}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-emerald-50 text-emerald-700 font-bold font-mono text-xs px-2.5 py-1 rounded-md border border-emerald-100">
                      {formatCurrencyValue(log.cost, currencyPreference, languagePreference)}
                    </span>
                    <button
                      id={`btn-delete-log-history-${log.id}`}
                      onClick={() => setDeleteConfirmId(log.id)}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 p-1 rounded-lg transition cursor-pointer"
                      title={languagePreference === 'zh-TW' ? '刪除此保養紀錄' : 'Delete log'}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                
                {log.notes && (
                  <p className="text-slate-650 text-xs mt-1 bg-white p-2.5 rounded-lg border border-slate-150 italic leading-relaxed">
                    {log.notes}
                  </p>
                )}
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* COMPACT MODAL POPUP FORM [RECONSTRUCTED] */}
      {showFormModal && (
        <div id="modal-log-add-record" className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-xs animate-fade-in text-slate-900">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-150 overflow-hidden transform scale-95 md:scale-100 transition-all duration-300">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wider font-mono flex items-center space-x-2">
                <History className="h-4 w-4 text-blue-400" />
                <span>{languagePreference === 'zh-TW' ? '登錄行車保修日誌' : 'Log Maintenance Service'}</span>
              </h3>
              <button 
                id="btn-close-record-form"
                onClick={() => setShowFormModal(false)}
                className="text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {errorText && (
                <div id="record-form-error-banner" className="bg-red-50 text-red-700 p-2.5 rounded-lg border border-red-100 font-semibold">
                  {errorText}
                </div>
              )}

              <div>
                <label className="block text:[10px] font-bold text-slate-500 uppercase tracking-wider">{languagePreference === 'zh-TW' ? '保養項目分類 *' : 'Service Category *'}</label>
                <select
                  id="log-form-category"
                  value={logServiceType}
                  onChange={(e) => setLogServiceType(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 font-sans focus:ring-1 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="Oil Change">{languagePreference === 'zh-TW' ? '機油與油芯更換' : 'Oil Change'}</option>
                  <option value="Tire Rotation">{languagePreference === 'zh-TW' ? '輪胎對調與平衡' : 'Tire Rotation'}</option>
                  <option value="Brake Pad Replacement">{languagePreference === 'zh-TW' ? '煞車片更換' : 'Brake Pad Replacement'}</option>
                  <option value="Brake Fluid Flush">{languagePreference === 'zh-TW' ? '煞車油更換' : 'Brake Fluid Flush'}</option>
                  <option value="Engine Cabin Filter">{languagePreference === 'zh-TW' ? '引擎或冷氣濾網' : 'Engine Cabin Filter'}</option>
                  <option value="Spark Plug Upgrade">{languagePreference === 'zh-TW' ? '火星塞升級與更換' : 'Spark Plug Upgrade'}</option>
                  <option value="Timing Belt Renewal">{languagePreference === 'zh-TW' ? '正時皮帶/皮帶更換' : 'Timing Belt Renewal'}</option>
                  <option value="Battery Inspection">{languagePreference === 'zh-TW' ? '電瓶檢測與更換' : 'Battery Inspection'}</option>
                  <option value="Transmission Fluid Flush">{languagePreference === 'zh-TW' ? '變速箱油更換' : 'Transmission Fluid Flush'}</option>
                  <option value="Coolant Refill">{languagePreference === 'zh-TW' ? '水箱冷卻液補充/更換' : 'Coolant Refill'}</option>
                  <option value="General Inspection">{languagePreference === 'zh-TW' ? '常規全車檢查 / 診斷' : 'General Inspection / Diagnostic'}</option>
                  <option value="Other Repair">{languagePreference === 'zh-TW' ? '其他特定維修項目' : 'Other Specific Repair'}</option>
                </select>
              </div>

              {logServiceType === 'Other Repair' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{languagePreference === 'zh-TW' ? '指定維修名稱 / 細節 *' : 'Specify Action Name *'}</label>
                  <input
                    id="log-form-custom-type"
                    type="text"
                    required
                    placeholder={languagePreference === 'zh-TW' ? '例如：啟動馬達、正時鏈條維修' : "e.g. Starter replacement"}
                    value={customServiceType}
                    onChange={(e) => setCustomServiceType(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{languagePreference === 'zh-TW' ? '保修日期 *' : 'Service Date *'}</label>
                  <input
                    id="log-form-date"
                    type="date"
                    required
                    value={logDate}
                    onChange={(e) => setLogDate(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{languagePreference === 'zh-TW' ? `行車里程錶 (${getDistanceUnit(unitPreference).toUpperCase()}) *` : `Odometer (${getDistanceUnit(unitPreference).toUpperCase()}) *`}</label>
                  <input
                    id="log-form-mileage"
                    type="number"
                    required
                    min="0"
                    placeholder={languagePreference === 'zh-TW' ? '登錄里程數值' : "Odometer reading"}
                    value={logMileage}
                    onChange={(e) => setLogMileage(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none opacity-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text:[10px] font-bold text-slate-500 uppercase tracking-wider">{t('history.costCurrencyLabel')} ({currencyPreference}) *</label>
                <div className="relative mt-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400 font-sans font-bold text-xs">
                    {currencyPreference === 'TWD' ? 'NT$' : '$'}
                  </div>
                  <input
                    id="log-form-cost"
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    placeholder="e.g. 500"
                    value={logCost}
                    onChange={(e) => setLogCost(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{languagePreference === 'zh-TW' ? '備註及零件規格細節摘要' : 'Description & Part Notes'}</label>
                <textarea
                  id="log-form-notes"
                  rows={2}
                  placeholder={languagePreference === 'zh-TW' ? '例如：使用正廠航太材料零件、做了四輪平衡校正...' : "e.g. Used genuine OEM parts, adjusted tire alignment..."}
                  value={logNotes}
                  onChange={(e) => setLogNotes(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-1.5 flex justify-end space-x-2">
                <button
                  id="btn-cancel-add-log"
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-55 cursor-pointer animate-none"
                >
                  {t('common.cancel')}
                </button>
                <button
                  id="btn-submit-add-log"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (languagePreference === 'zh-TW' ? '正在登錄...' : 'Logging...') : (languagePreference === 'zh-TW' ? '儲存保養紀錄' : 'Save Record')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
