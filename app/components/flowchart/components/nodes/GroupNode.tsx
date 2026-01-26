import { MouseEvent as ReactMouseEvent } from 'react';
import { Handle, Position, NodeResizer } from '@xyflow/react';
import { nodeColors } from '../../constants';

export interface GroupNodeData {
  title: string;
  description: string;
  collapsed: boolean;
  childCount: number;
  width: number;
  height: number;
  onToggleCollapse?: () => void;
  onContextMenu?: (event: ReactMouseEvent, nodeId: string) => void;
  nodeId?: string;
}

// Group node component - collapsible container for other nodes
export function GroupNode({ data, selected }: { data: GroupNodeData; selected?: boolean }) {
  const colors = nodeColors['group'];

  const handleDoubleClick = () => {
    if (data.onToggleCollapse) {
      data.onToggleCollapse();
    }
  };

  const handleContextMenu = (event: ReactMouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (data.onContextMenu && data.nodeId) {
      data.onContextMenu(event, data.nodeId);
    }
  };

  // Only show resizer when selected and not collapsed
  const showResizer = selected && !data.collapsed;

  return (
    <>
      <NodeResizer
        minWidth={220}
        minHeight={120}
        isVisible={showResizer}
        lineClassName="group-resizer-line"
        handleClassName="group-resizer-handle"
      />
      <div
        className={`group-node ${data.collapsed ? 'collapsed' : ''}`}
        style={{
          backgroundColor: data.collapsed ? colors.bg : `${colors.bg}80`,
          borderColor: colors.border,
          width: data.collapsed ? 220 : '100%',
          height: data.collapsed ? 70 : '100%',
          minWidth: 220,
          minHeight: data.collapsed ? 70 : 120,
        }}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <Handle type="target" position={Position.Top} id="top" />
        <Handle type="target" position={Position.Left} id="left" />
        <Handle type="source" position={Position.Right} id="right" />
        <Handle type="source" position={Position.Bottom} id="bottom" />
        <div className="group-header">
          <div className="group-collapse-icon">
            {data.collapsed ? '\u25B6' : '\u25BC'}
          </div>
          <div className="group-title-container">
            <div className="group-title" style={{ color: colors.border }}>
              {data.title}
            </div>
            <div className="group-description">
              {data.collapsed ? `${data.childCount} nodes` : data.description}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
