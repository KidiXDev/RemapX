import { Input } from '@/components/common/input';
import { Mapping } from '@/hooks/use-settings-store';
import {
  formatMappingValue,
  getStickMotionLabel
} from '@/lib/mapping-utils';
import {
  Gamepad as GamepadIcon,
  Search,
  Trash2,
  X,
  Zap
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

export const buttonLabelMap: Record<number, string> = {
  0: 'A',
  1: 'B',
  2: 'X',
  3: 'Y',
  4: 'LB',
  5: 'RB',
  6: 'LT',
  7: 'RT',
  8: 'Select',
  9: 'Start',
  10: 'Mode',
  11: 'L3',
  12: 'R3',
  13: 'D-Up',
  14: 'D-Down',
  15: 'D-Left',
  16: 'D-Right',
  100: 'L-Stick Move',
  101: 'R-Stick Move'
};

interface MappingsListProps {
  mappings: Mapping[];
  onDeleteMapping: (buttonId: number) => void | Promise<void>;
  profileName: string;
}

export function MappingsList({
  mappings,
  onDeleteMapping,
  profileName
}: MappingsListProps) {
  const { t } = useTranslation('remap');
  const [bindingsQuery, setBindingsQuery] = useState('');

  const filteredMappings = useMemo(() => {
    if (!bindingsQuery.trim()) return mappings;
    const query = bindingsQuery.toLowerCase();
    return mappings.filter((map) => {
      const btnLabel = (
        getStickMotionLabel(map.button_id) || buttonLabelMap[map.button_id] || ''
      ).toLowerCase();
      const keyStr = formatMappingValue(map).toLowerCase();
      return btnLabel.includes(query) || keyStr.includes(query);
    });
  }, [mappings, bindingsQuery]);

  return (
    <div className="space-y-4">
      {/* Search Field */}
      {mappings.length > 0 && (
        <Input
          value={bindingsQuery}
          onChange={(e) => setBindingsQuery(e.target.value)}
          placeholder={t('searchBindingsPlaceholder')}
          leftIcon={<Search className="w-4 h-4 text-zinc-500" />}
          rightIcon={
            bindingsQuery ? (
              <button
                onClick={() => setBindingsQuery('')}
                className="text-zinc-500 hover:text-zinc-300 transition"
              >
                <X className="w-4 h-4" />
              </button>
            ) : null
          }
        />
      )}

      {mappings.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border-main/50 rounded-xl bg-zinc-950/15">
          <GamepadIcon className="w-8 h-8 text-zinc-600 mx-auto mb-2.5" />
          <p className="text-xs text-zinc-400 font-semibold">
            {t('bindings.emptyTitle')}
          </p>
          <p className="text-xs text-zinc-500 mt-1 max-w-[280px] mx-auto leading-relaxed">
            {t('bindings.emptyDesc')}
          </p>
        </div>
      ) : filteredMappings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-xs text-zinc-500">
            {t('bindings.noMatchPrefix')} "{bindingsQuery}".
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Table Header */}
          <div className="grid grid-cols-12 text-xs font-bold text-zinc-500 uppercase tracking-widest px-5 mb-2.5">
            <div className="col-span-3">
              {t('bindings.headerGamepadControl')}
            </div>
            <div className="col-span-1 text-center"></div>
            <div className="col-span-3">
              {t('bindings.headerMappedKey')}
            </div>
            <div className="col-span-3">
              {t('bindings.headerType')}
            </div>
            <div className="col-span-2 text-right">
              {t('bindings.headerAction')}
            </div>
          </div>

          {/* Mappings Rows */}
          <div className="space-y-2.5">
            {filteredMappings.map((map) => (
              <div
                key={`${profileName}-${map.button_id}`}
                className="grid grid-cols-12 items-center bg-zinc-900/25 hover:bg-zinc-900/45 border border-border-main/30 hover:border-border-hover rounded-xl px-5 py-3 transition duration-150 group/row shadow-sm"
              >
                {/* Gamepad Input */}
                <div className="col-span-3 flex items-center">
                  <span className="inline-flex items-center justify-center min-w-10 h-7 px-2.5 rounded-full bg-primary-bg border border-primary-border/80 text-primary-text font-bold text-xs uppercase shadow-sm">
                    {getStickMotionLabel(map.button_id) ||
                      buttonLabelMap[map.button_id] ||
                      `Button ${map.button_id}`}
                  </span>
                </div>

                {/* Visual Connector */}
                <div className="col-span-1 flex items-center justify-center">
                  <Zap className="w-3 h-3 text-zinc-600 group-hover/row:text-primary-text transition-colors duration-300" />
                </div>

                {/* Mapped Keyboard Keycap */}
                <div className="col-span-3 flex items-center">
                  <kbd className="min-w-[32px] h-7 px-2.5 flex items-center justify-center rounded-lg bg-zinc-950 border border-zinc-700 text-zinc-100 text-xs font-mono font-bold shadow-md shadow-black/60 uppercase">
                    {formatMappingValue(map)}
                  </kbd>
                </div>

                {/* Mapping Type Tag */}
                <div className="col-span-3">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-zinc-950 text-zinc-400 border border-border-main/40 uppercase tracking-wider">
                    {map.mapping_type}
                  </span>
                </div>

                {/* Action Column */}
                <div className="col-span-2 text-right">
                  <button
                    onClick={() => onDeleteMapping(map.button_id)}
                    className="text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all active:scale-95 cursor-pointer"
                    title={t('bindings.deleteMapping')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
