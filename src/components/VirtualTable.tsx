import Table from 'antd/lib/table';
import classNames from 'classnames';
import ResizeObserver from 'rc-resize-observer';
import React, { useEffect, useRef, useState } from 'react';
import { VariableSizeGrid as Grid } from 'react-window';

export default function VirtualTable(props: Parameters<typeof Table>[0]) {
  const { columns = [], scroll } = props;
  const [tableWidth, setTableWidth] = useState(0);

  const mergedColumns = columns.map((column) => {
    if (column.width) {
      return column;
    }

    return {
      ...column,
      width: Math.floor(tableWidth / columns.length),
    };
  });

  const gridRef = useRef<any>();
  const [connectObject] = useState<any>(() => {
    const obj = {};
    Object.defineProperty(obj, 'scrollLeft', {
      get: () => null,
      set: (scrollLeft: number) => {
        if (gridRef.current) {
          gridRef.current.scrollTo({ scrollLeft });
        }
      },
    });

    return obj;
  });

  const resetVirtualGrid = () => {
    if (gridRef && gridRef.current) {
      gridRef.current.resetAfterIndices({
        columnIndex: 0,
        shouldForceUpdate: false,
      });
    }
  };

  useEffect(() => resetVirtualGrid, [tableWidth]);

  const renderVirtualList = (data: readonly object[], { scrollbarSize, ref, onScroll }: any) => {
    ref.current = connectObject;
    const totalHeight = data.length * 54;

    return (
      <Grid
        ref={gridRef}
        className="virtual-grid"
        columnCount={columns.length}
        columnWidth={(index: number) => {
          const { width } = mergedColumns[index];
          return totalHeight > scroll!.y! && index === columns.length - 1
            ? (width as number) - scrollbarSize - 1
            : (width as number);
        }}
        height={scroll!.y as number}
        rowCount={data.length}
        rowHeight={() => 64}
        width={tableWidth}
        onScroll={({ scrollLeft }: { scrollLeft: number }) => {
          onScroll({ scrollLeft });
        }}
      >
        {({ columnIndex, rowIndex, style }: { columnIndex: number; rowIndex: number; style: React.CSSProperties }) => {
          const record = data[rowIndex] as any;
          const column = columns[columnIndex] as any;
          const text = column.dataIndex ? record[column.dataIndex] : undefined;
          return (
            <div
              className={classNames('virtual-table-cell ant-table-cell', {
                'virtual-table-cell-last': columnIndex === columns.length - 1,
              })}
              style={{ ...style, textAlign: column.align }}
            >
              {column.render ? column.render(text, record) : text}
            </div>
          );
        }}
      </Grid>
    );
  };

  return (
    <ResizeObserver onResize={({ width }) => setTableWidth(width)}>
      <Table
        {...props}
        className="virtual-table"
        columns={mergedColumns}
        pagination={false}
        components={{
          body: renderVirtualList,
        }}
      />
    </ResizeObserver>
  );
}
