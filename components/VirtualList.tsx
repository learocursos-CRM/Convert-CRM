import React from 'react';
import { FixedSizeList as List } from 'react-window';
import * as AutoSizerModule from 'react-virtualized-auto-sizer';
// @ts-ignore
const AutoSizer = AutoSizerModule.default || AutoSizerModule;

interface VirtualListProps<T> {
    items: T[];
    itemHeight: number;
    renderItem: (props: { item: T; style: React.CSSProperties; index: number }) => React.ReactNode;
    height?: number | string;
    className?: string;
}

export const VirtualList = <T,>({ items, itemHeight, renderItem, height = '100%', className }: VirtualListProps<T>) => {
    return (
        <div className={className} style={{ height }}>
            <AutoSizer>
                {({ height: autoHeight, width: autoWidth }) => (
                    <List
                        height={autoHeight}
                        itemCount={items.length}
                        itemSize={itemHeight}
                        width={autoWidth}
                    >
                        {({ index, style }) => renderItem({ item: items[index], style, index })}
                    </List>
                )}
            </AutoSizer>
        </div>
    );
};
