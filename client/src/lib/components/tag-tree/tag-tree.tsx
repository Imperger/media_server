import { KeyboardArrowDown, KeyboardArrowRight } from '@mui/icons-material';
import { Box, Button } from '@mui/material';
import {
  DefaultComponentProps,
  OverridableTypeMap
} from '@mui/material/OverridableComponent';
import { ReactElement, useState, MouseEvent, useEffect } from 'react';

import styles from './tag-tree.module.css';

import { Tag } from '@/api-service/meta-info';

export type TagTree = { [key: string]: TagTree | string };

interface ItemComponentProps {
  label: string;
}

export interface TagTreeProps
  extends DefaultComponentProps<OverridableTypeMap> {
  tree: TagTree;
  tagsStyle: Tag[];
  itemComponent: (props: ItemComponentProps) => ReactElement;
  onSelect?: (path: string) => void;
}

export function TagTree({
  tree,
  tagsStyle,
  itemComponent,
  onSelect,
  ...props
}: TagTreeProps) {
  const [selected, setSelected] = useState('');
  const [expandAll, setExpandAll] = useState<{ value: boolean }>({
    value: false
  });

  const onSelectFn = (path: string) => {
    setSelected(path);

    if (onSelect) {
      onSelect(path);
    }
  };

  return (
    <Box className={styles.tagTree} {...props}>
      <Box className={styles.treeView}>
        <TagTreeNode
          tree={tree}
          tagsStyle={tagsStyle}
          itemComponent={itemComponent}
          label={''}
          path={''}
          selected={selected}
          onSelect={onSelectFn}
          expandAll={expandAll}
        />
      </Box>
      <Box className={styles.controls}>
        <Box>
          <Button onClick={() => setExpandAll({ value: true })}>
            Expand all
          </Button>
          <Button onClick={() => setExpandAll({ value: false })}>
            Collapse all
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

interface TagTreeNodeProps {
  tree: TagTree;
  tagsStyle: Tag[];
  itemComponent: (props: ItemComponentProps) => ReactElement;
  onSelect?: (path: string) => void;
  label: string;
  path: string;
  selected: string;
  expandAll: { value: boolean };
}

function TagTreeNode({
  tree,
  tagsStyle,
  itemComponent,
  label,
  path,
  selected,
  onSelect,
  expandAll
}: TagTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(path === '');

  useEffect(
    () => void setIsExpanded(expandAll.value || path === ''),
    [expandAll, path]
  );

  const toggleExpand = (e: MouseEvent<HTMLElement>) => {
    e.stopPropagation();

    if (path !== '') {
      setIsExpanded((x) => !x);
    }
  };

  const onSelectFn = (label: string) => onSelect && onSelect(label);

  const getStyle = (path: string) => {
    const tag = tagsStyle.find((x) => x.tag === path);

    if (tag === undefined) {
      return {};
    }

    return {
      color: tag.style.fontColor,
      backgroundColor: tag.style.backgroundColor
    };
  };

  return (
    <>
      <Box
        sx={{ display: 'inline', whiteSpace: 'nowrap' }}
        onClick={toggleExpand}
      >
        {label !== '' &&
          (isExpanded ? <KeyboardArrowDown /> : <KeyboardArrowRight />)}
        {itemComponent({ label })}
      </Box>
      <ul style={{ display: isExpanded ? 'block' : 'none' }}>
        {Object.keys(tree).map((x) => {
          const itemPath = path ? `${path}.${x}` : x;

          if (typeof tree[x] === 'string') {
            return (
              <li
                className={`${styles.listItem} ${styles.listItemLeaf} ${selected === itemPath ? styles.listItemLeafSelected : ''}`}
                key={x}
                onClick={() => onSelectFn(itemPath)}
                style={getStyle(itemPath)}
              >
                {itemComponent({ label: x })}
              </li>
            );
          } else {
            return (
              <li className={styles.listItem} key={x}>
                <TagTreeNode
                  tree={tree[x]}
                  tagsStyle={tagsStyle}
                  itemComponent={itemComponent}
                  label={x}
                  path={itemPath}
                  selected={selected}
                  onSelect={onSelect}
                  expandAll={expandAll}
                />
              </li>
            );
          }
        })}
      </ul>
    </>
  );
}
