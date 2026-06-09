import React, { useState } from 'react';
import { 
  BellRing, BellPlus, CheckCircle2, Trash2, Calendar, Gauge, X, Info 
} from 'lucide-react';
import { ReminderType } from '../types';
import { useAppState } from '../context/AppContext';
import { formatDistance, getDistanceLabel, getDistanceUnit } from '../lib/units';

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

interface ReminderManagerProps {
  reminders: any[];
  currentMileage: number;
  onAddReminder: (data: {
    serviceType: string;
    type: ReminderType;
    targetMileage?: number;
    targetDate?: string;
  }) => Promise<void>;
  onCompleteReminder: (id: string) => Promise<void>;
  onDeleteReminder: (id: string) => Promise<void>;
}

export default function ReminderManager({
  reminders,
  currentMileage,
  onAddReminder,
  onCompleteReminder,
  onDeleteReminder,
}: ReminderManagerProps) {
  const { unitPreference, languagePreference, t } = useAppState();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteErrorText, setDeleteErrorText] = useState<string | null>(null);

  // Form states
  const [remServiceType, setRemServiceType] = useState('Oil Change');
  const [customServiceType, setCustomServiceType] = useState('');
  const [remType, setRemType] = useState<ReminderType>(ReminderType.MILEAGE);
  const [remTargetMileage, setRemTargetMileage] = useState('');
  const [remTargetDate, setRemTargetDate] = useState('');

  const handleOpenConfig = () => {
    setErrorText(null);
    setRemServiceType('Oil Change');
    setCustomServiceType('');
    setRemType(ReminderType.MILEAGE);
    // Suggest 5,000 km offset
    const offset = 5000;
    setRemTargetMileage((currentMileage + offset).toString());
    setRemTargetDate('');
    setShowConfigModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    const actualServiceType = remServiceType === 'Other Repair' && customServiceType.trim()
      ? customServiceType.trim()
      : remServiceType;

    if (!actualServiceType.trim()) {
      setErrorText(t('reminder.descErr'));
      return;
    }

    const payload: any = {
      serviceType: actualServiceType.trim(),
      type: remType,
    };

    if (remType === ReminderType.MILEAGE) {
      if (!remTargetMileage) {
        setErrorText(t('reminder.milestoneErr'));
        return;
      }
      const val = Number(remTargetMileage);
      if (isNaN(val) || val <= 0) {
        setErrorText(t('reminder.positiveErr'));
        return;
      }
      payload.targetMileage = val;
    } else {
      if (!remTargetDate) {
        setErrorText(t('reminder.dateErr'));
        return;
      }
      payload.targetDate = remTargetDate;
    }

    setIsSubmitting(true);
    try {
      await onAddReminder(payload);
      setShowConfigModal(false);
    } catch (err: any) {
      setErrorText(err.message || t('reminder.scheduleError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    setDeleteErrorText(null);
    try {
      await onDeleteReminder(id);
      setDeleteConfirmId(null);
    } catch (err: any) {
      setDeleteErrorText(err.message || t('reminder.removeError'));
    }
  };

  return (
    <div id="reminder-manager-section" className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5 space-y-4">
      {/* Header controls bar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <BellRing className="h-4.5 w-4.5 text-slate-500" />
          <h3 className="font-bold text-slate-900 text-sm uppercase tracking-wider font-sans">
            {t('reminder.alertReminders')}
          </h3>
        </div>
        <button
          id="btn-trigger-add-reminder"
          onClick={handleOpenConfig}
          className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs px-2.5 py-1.5 rounded-xl flex items-center space-x-1 cursor-pointer transition select-none"
        >
          <BellPlus className="h-3.5 w-3.5" />
          <span>{t('reminder.addReminder')}</span>
        </button>
      </div>

      {/* Checklist list grouped by severity */}
      {reminders.length === 0 ? (
        <p className="text-slate-400 text-xs py-10 text-center italic leading-relaxed">
          {t('reminder.noRemindersDesc')}
        </p>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {reminders.map((r) => {
            let isOverdue = false;
            let isDueSoon = false;

            if (!r.isCompleted) {
              if (r.type === ReminderType.MILEAGE && r.targetMileage) {
                const diff = r.targetMileage - currentMileage;
                if (diff <= 0) {
                  isOverdue = true;
                } else if (diff <= 1000) {
                  isDueSoon = true;
                }
              } else if (r.type === ReminderType.DATE && r.targetDate) {
                const today = new Date().toISOString().split('T')[0];
                const diffMs = new Date(r.targetDate).getTime() - new Date(today).getTime();
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                if (diffDays < 0) {
                  isOverdue = true;
                } else if (diffDays <= 14) {
                  isDueSoon = true;
                }
              }
            }

            // Highlight theme class assignment
            const themeClass = r.isCompleted
              ? 'bg-slate-50 border-slate-200 text-slate-500'
              : isOverdue
                ? 'bg-rose-50 border-rose-200 text-rose-950 ring-1 ring-rose-500/10'
                : isDueSoon
                  ? 'bg-amber-50 border-amber-200 text-amber-950 ring-1 ring-amber-500/10'
                  : 'bg-emerald-50/60 border-emerald-100 text-emerald-950';

            if (deleteConfirmId === r.id) {
              return (
                <div 
                  key={r.id} 
                  id={`reminder-card-confirm-delete-${r.id}`}
                  className="p-3.5 rounded-xl border border-red-200 bg-red-50 text-xs flex flex-col justify-between gap-3 transition-colors animate-fade-in"
                >
                  <div className="flex flex-col space-y-1">
                    <p className="font-bold text-red-900 text-xs">
                      {languagePreference === 'zh-TW' 
                        ? `確定刪除「${getLocalizedServiceType(r.serviceType, languagePreference)}」此項提醒通知嗎？` 
                        : `Are you sure you want to delete the reminder for "${getLocalizedServiceType(r.serviceType, languagePreference)}"?`}
                    </p>
                    {deleteErrorText && (
                      <p className="text-[10px] text-red-700 font-semibold">{deleteErrorText}</p>
                    )}
                  </div>
                  <div className="flex justify-end space-x-2 font-semibold">
                    <button
                      id={`btn-cancel-delete-reminder-${r.id}`}
                      onClick={() => {
                        setDeleteConfirmId(null);
                        setDeleteErrorText(null);
                      }}
                      className="px-2.5 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-[10px] hover:bg-slate-50 cursor-pointer font-bold"
                    >
                      {languagePreference === 'zh-TW' ? '取消' : 'Cancel'}
                    </button>
                    <button
                      id={`btn-confirm-delete-reminder-${r.id}`}
                      onClick={() => handleDelete(r.id, r.serviceType)}
                      className="px-2.5 py-1.5 bg-red-600 text-white rounded-lg text-[10px] hover:bg-red-700 cursor-pointer font-bold"
                    >
                      {languagePreference === 'zh-TW' ? '確認刪除' : 'Delete'}
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={r.id} 
                id={`reminder-card-${r.id}`}
                className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between gap-3 transition-colors ${themeClass}`}
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-0.5">
                    <p className="font-bold font-sans text-sm line-clamp-1">{getLocalizedServiceType(r.serviceType, languagePreference)}</p>
                    <p className="font-mono text-[11px] text-slate-500 flex items-center space-x-1 mt-0.5">
                      {r.type === ReminderType.MILEAGE ? (
                        <>
                          <Gauge className="h-3 w-3 inline mr-1 text-slate-400" />
                          <span>{t('reminder.target')} {formatDistance(r.targetMileage || 0, unitPreference)} ({formatDistance(currentMileage, unitPreference)} {t('reminder.activeOdometer')})</span>
                        </>
                      ) : (
                        <>
                          <Calendar className="h-3 w-3 inline mr-1 text-slate-400" />
                          <span>{t('reminder.targetDateLabel')} {r.targetDate}</span>
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    id={`btn-delete-reminder-${r.id}`}
                    onClick={() => setDeleteConfirmId(r.id)}
                    className="text-slate-400 hover:text-red-500 p-0.5 rounded transition cursor-pointer shrink-0"
                    title="Remove reminder"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-200/40">
                  <div>
                    {r.isCompleted ? (
                      <span className="inline-flex items-center space-x-1.5 text-emerald-600 font-bold text-[10px]">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>{t('reminder.completed')}</span>
                      </span>
                    ) : isOverdue ? (
                      <span className="font-mono font-bold text-rose-700 text-[10px] px-2 py-0.5 bg-rose-100 rounded-md uppercase tracking-wider">{t('reminder.overdue')}</span>
                    ) : isDueSoon ? (
                      <span className="font-mono font-bold text-amber-700 text-[10px] px-2 py-0.5 bg-amber-100 rounded-md uppercase tracking-wider">{t('reminder.dueSoon')}</span>
                    ) : (
                      <span className="font-mono font-bold text-emerald-700 text-[10px] px-2 py-0.5 bg-emerald-100 rounded-md uppercase tracking-wider">{t('reminder.healthy')}</span>
                    )}
                  </div>

                  {!r.isCompleted && (
                    <button
                      id={`btn-complete-reminder-${r.id}`}
                      onClick={() => onCompleteReminder(r.id)}
                      className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-xs cursor-pointer transition select-none"
                    >
                      {t('reminder.markCompleted')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* POPUP REMINDER SETUP INTERFACE */}
      {showConfigModal && (
        <div id="modal-reminder-add" className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-xs animate-fade-in text-slate-900">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm border border-slate-155 overflow-hidden transform scale-95 md:scale-100 transition-all duration-300">
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <h3 className="font-bold text-sm uppercase tracking-wider font-mono flex items-center space-x-2">
                <BellRing className="h-4 w-4 text-blue-400" />
                <span>{t('reminder.configureTitle')}</span>
              </h3>
              <button 
                id="btn-close-reminder-form"
                onClick={() => setShowConfigModal(false)}
                className="text-slate-300 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {errorText && (
                <div id="reminder-form-error-banner" className="bg-red-50 text-red-700 p-2.5 rounded-lg border border-red-100 font-semibold">
                  {errorText}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('reminder.descriptionLabel')}</label>
                <select
                  id="reminder-form-service-select"
                  value={remServiceType}
                  onChange={(e) => setRemServiceType(e.target.value)}
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

              {remServiceType === 'Other Repair' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{languagePreference === 'zh-TW' ? '指定特殊維護項目名稱 *' : 'Specify Custom Service *'}</label>
                  <input
                    id="reminder-form-service-input"
                    type="text"
                    required
                    placeholder={languagePreference === 'zh-TW' ? '例如 補冷媒、大燈更換等' : 'e.g. AC recharge, headlight swap'}
                    value={customServiceType}
                    onChange={(e) => setCustomServiceType(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('reminder.triggerSourceLabel')}</label>
                <div className="mt-1 flex gap-2">
                  <button
                    id="btn-rule-mileage"
                    type="button"
                    onClick={() => setRemType(ReminderType.MILEAGE)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition text-center cursor-pointer ${
                      remType === ReminderType.MILEAGE 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {t('reminder.triggerMileageOpt')}
                  </button>
                  <button
                    id="btn-rule-date"
                    type="button"
                    onClick={() => setRemType(ReminderType.DATE)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition text-center cursor-pointer ${
                      remType === ReminderType.DATE 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {t('reminder.triggerDateOpt')}
                  </button>
                </div>
              </div>

              {remType === ReminderType.MILEAGE ? (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('reminder.limitTargetLabel')} ({getDistanceLabel(unitPreference)}) *</label>
                  <div className="relative mt-1">
                    <input
                      id="reminder-form-target-mileage"
                      type="number"
                      required
                      min={currentMileage}
                      placeholder={`e.g. ${currentMileage + (unitPreference === 'metric' ? 5000 : 3000)}`}
                      value={remTargetMileage}
                      onChange={(e) => setRemTargetMileage(e.target.value)}
                      className="block w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs text-slate-400 font-mono">
                      {getDistanceUnit(unitPreference)}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 italic">
                    {t('reminder.currentMileageIs')} <span className="font-bold text-slate-650">{formatDistance(currentMileage, unitPreference)}</span>.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('reminder.targetDateShort')} *</label>
                  <input
                    id="reminder-form-target-date"
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={remTargetDate}
                    onChange={(e) => setRemTargetDate(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-900 font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1 italic">
                    {t('reminder.statusReasonNote')}
                  </p>
                </div>
              )}

              <div className="flex items-start space-x-1 text-[10px] text-slate-500">
                <Info className="h-4 w-4 text-blue-500 shrink-0" />
                <span>{t('reminder.dynamicEvalNote')}</span>
              </div>

              <div className="pt-2 flex justify-end space-x-2 font-semibold">
                <button
                  id="btn-cancel-add-reminder"
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  id="btn-submit-add-reminder"
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? t('reminder.schedulingState') : t('reminder.setBtn')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
