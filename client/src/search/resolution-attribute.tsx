import { AspectRatio as AspectRatioIcon } from '@mui/icons-material';
import {
  Button,
  Divider,
  Menu,
  MenuItem,
  Select,
  SelectChangeEvent,
  Stack
} from '@mui/material';
import { useState } from 'react';
import { match } from 'ts-pattern';

import { NativeRWState } from '@/lib/rw-state';

export interface Resolution {
  width: number;
  height: number;
}

type Condition = 'less' | 'less_equal' | 'equal' | 'greater_equal' | 'greater';

function resolutionToString(resolution: Resolution) {
  return `${resolution.width}x${resolution.height}`;
}

function stringToResolution(str: string): Resolution {
  const [width, height] = str.split('x').map((x) => Number.parseInt(x));

  return { width, height };
}

export interface ResolutionAttributeProps
  extends NativeRWState<'selectedResolution', Resolution>,
    NativeRWState<'condition', Condition> {
  availableResolutions: Resolution[];
}

export default function ResolutionAttribute({
  availableResolutions,
  selectedResolution,
  setSelectedResolution,
  condition,
  setCondition
}: ResolutionAttributeProps) {
  const [conditionMenuAnchor, setConditionMenuAnchor] =
    useState<HTMLElement | null>(null);

  const onOpenConditionMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setConditionMenuAnchor(event.currentTarget);
  };

  const onCloseConditionMenu = () => setConditionMenuAnchor(null);

  const onSetCondition = (x: Condition) => () => {
    setCondition(x);

    onCloseConditionMenu();
  };

  const conditionBtnCaption = match(condition)
    .with('less', () => '<')
    .with('less_equal', () => '≤')
    .with('equal', () => '=')
    .with('greater_equal', () => '≥')
    .with('greater', () => '>')
    .exhaustive();

  const resolutionCaption = resolutionToString(selectedResolution);

  const onSelectResolution = (e: SelectChangeEvent) => {
    setSelectedResolution(stringToResolution(e.target.value));
  };

  const isConditionMenuOpen = Boolean(conditionMenuAnchor);

  return (
    <>
      <Stack direction="row" alignItems="center">
        <AspectRatioIcon style={{ width: '30px', height: '30px' }} />
        <Button
          style={{
            maxWidth: '50px',
            minWidth: '50px',
            maxHeight: '50px',
            fontSize: '2.5em'
          }}
          size="small"
          onClick={onOpenConditionMenu}
        >
          {conditionBtnCaption}
        </Button>
        <Select
          label="Resolution"
          value={resolutionCaption}
          onChange={onSelectResolution}
        >
          {availableResolutions.flatMap((x, n, arr) => {
            const formatted = resolutionToString(x);

            const isPrevOrientationPortrait =
              n > 0 ? arr[n - 1].width / arr[n - 1].height < 1 : true;

            const isCurrentOrientationPortrait =
              arr[n].width / arr[n].height < 1;

            const isNeedOrientationDivider =
              n > 0 &&
              isPrevOrientationPortrait !== isCurrentOrientationPortrait;

            const menuItem = (
              <MenuItem key={formatted} value={formatted}>
                {formatted}
              </MenuItem>
            );

            return isNeedOrientationDivider
              ? [<Divider key="orientation_divider" component="li" />, menuItem]
              : menuItem;
          })}
        </Select>
      </Stack>
      <Menu
        anchorEl={conditionMenuAnchor}
        open={isConditionMenuOpen}
        onClose={onCloseConditionMenu}
      >
        <MenuItem onClick={onSetCondition('less')}>&lt;</MenuItem>
        <MenuItem onClick={onSetCondition('less_equal')}>≤</MenuItem>
        <MenuItem onClick={onSetCondition('equal')}>=</MenuItem>
        <MenuItem onClick={onSetCondition('greater_equal')}>≥</MenuItem>
        <MenuItem onClick={onSetCondition('greater')}>&gt;</MenuItem>
      </Menu>
    </>
  );
}
