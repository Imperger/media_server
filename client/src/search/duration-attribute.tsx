import { AccessTime as AccessTimeIcon } from '@mui/icons-material';
import { Button, Menu, MenuItem, Stack, TextField } from '@mui/material';
import { useState } from 'react';
import { match } from 'ts-pattern';

import { isInteger } from '@/lib/is-integer';
import { NativeRWState } from '@/lib/rw-state';

type Condition = 'less' | 'greater';
export type Unit = 'second' | 'minute' | 'hour';

export interface DurationAttributeProps
  extends NativeRWState<'duration', number>,
    NativeRWState<'unit', Unit>,
    NativeRWState<'condition', Condition> {}

export default function DurationAttribute({
  duration,
  setDuration,
  unit,
  setUnit,
  condition,
  setCondition
}: DurationAttributeProps) {
  const [unitMenuAnchor, setUnitMenuAnchor] = useState<HTMLElement | null>(
    null
  );

  const onSwitchCondition = () =>
    setCondition(condition === 'less' ? 'greater' : 'less');

  const onOpenUnitMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setUnitMenuAnchor(event.currentTarget);
  };

  const onInput = (value: string) => {
    if (!isInteger(value)) return;

    setDuration(Number.parseInt(value));
  };

  const onCloseUnitMenu = () => setUnitMenuAnchor(null);

  const onSetUnitSign = (x: Unit) => () => {
    setUnit(x);
    onCloseUnitMenu();
  };

  const conditionBtnCaption = match(condition)
    .with('less', () => '<')
    .with('greater', () => '>')
    .exhaustive();

  const unitBtnCaption = match(unit)
    .with('second', () => 's')
    .with('minute', () => 'm')
    .with('hour', () => 'h')
    .exhaustive();

  const isUnitMenuOpen = Boolean(unitMenuAnchor);

  return (
    <>
      <Stack direction="row" alignItems="center">
        <AccessTimeIcon style={{ width: '30px', height: '30px' }} />
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
        <TextField value={duration} onChange={(e) => onInput(e.target.value)} />
        <Button
          style={{
            maxWidth: '50px',
            minWidth: '50px',
            maxHeight: '50px',
            fontSize: '2.5em',
            textTransform: 'none'
          }}
          size="small"
          onClick={onOpenUnitMenu}
        >
          {unitBtnCaption}
        </Button>
      </Stack>
      <Menu
        anchorEl={unitMenuAnchor}
        open={isUnitMenuOpen}
        onClose={onCloseUnitMenu}
      >
        <MenuItem onClick={onSetUnitSign('second')}>s</MenuItem>
        <MenuItem onClick={onSetUnitSign('minute')}>m</MenuItem>
        <MenuItem onClick={onSetUnitSign('hour')}>h</MenuItem>
      </Menu>
    </>
  );
}
