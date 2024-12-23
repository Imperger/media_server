import { Button, Stack, TextField } from '@mui/material';
import { match } from 'ts-pattern';

import FileSizeIcon from '@/lib/components/icons/FileSizeIcon';
import { isInteger } from '@/lib/is-integer';
import { NativeRWState } from '@/lib/rw-state';

type Condition = 'less' | 'greater';
export type Unit = 'megabyte' | 'gigabyte';

export interface SizeAttributeProps
  extends NativeRWState<'size', number>,
    NativeRWState<'unit', Unit>,
    NativeRWState<'condition', Condition> {}

export default function SizeAttribute({
  size,
  setSize,
  unit,
  setUnit,
  condition,
  setCondition
}: SizeAttributeProps) {
  const onSwitchCondition = () =>
    setCondition(condition === 'less' ? 'greater' : 'less');

  const onSwitchUnit = () => {
    setUnit(unit === 'megabyte' ? 'gigabyte' : 'megabyte');
  };

  const onInput = (value: string) => {
    if (!isInteger(value)) return;

    setSize(Number.parseInt(value));
  };

  const conditionBtnCaption = match(condition)
    .with('less', () => '<')
    .with('greater', () => '>')
    .exhaustive();

  const unitBtnCaption = match(unit)
    .with('megabyte', () => 'MB')
    .with('gigabyte', () => 'GB')
    .exhaustive();

  return (
    <Stack direction="row" alignItems="center">
      <FileSizeIcon style={{ width: '30px', height: '30px' }} />
      <Button
        style={{
          maxWidth: '50px',
          minWidth: '50px',
          maxHeight: '50px',
          fontSize: '2.5em'
        }}
        size="small"
        onClick={onSwitchCondition}
      >
        {conditionBtnCaption}
      </Button>
      <TextField value={size} onChange={(e) => onInput(e.target.value)} />
      <Button
        style={{
          maxWidth: '70px',
          minWidth: '70px',
          maxHeight: '50px',
          fontSize: '2.5em',
          textTransform: 'none'
        }}
        size="small"
        onClick={onSwitchUnit}
      >
        {unitBtnCaption}
      </Button>
    </Stack>
  );
}
