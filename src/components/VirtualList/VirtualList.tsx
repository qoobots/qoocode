// Virtual List Component - Memory-efficient scrolling for large lists
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { Box, Text } from 'ink'
import type { Key } from 'react'

/**
 * Virtual List item renderer
 */
export interface VirtualListItem<T> {
  key: string | number
  data: T
  height: number
}

/**
 * Virtual List configuration
 */
export interface VirtualListProps<T> {
  items: VirtualListItem<T>[]
  renderItem: (item: T, index: number) => React.ReactNode
  itemHeight: number
  height: number
  width?: number
  overscan?: number
  onScroll?: (scrollTop: number) => void
  onItemClick?: (item: T, index: number) => void
  selectedIndex?: number
  className?: string
}

/**
 * Virtual List component for rendering large lists efficiently
 */
export function VirtualList<T>({
  items,
  renderItem,
  itemHeight,
  height,
  width,
  overscan = 3,
  onScroll,
  onItemClick,
  selectedIndex = -1,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + height) / itemHeight) + overscan
    )
    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, height, items.length, overscan])

  // Get visible items
  const visibleItems = useMemo(() => {
    const result: Array<{ item: VirtualListItem<T>; index: number }> = []
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      if (items[i]) {
        result.push({ item: items[i], index: i })
      }
    }
    return result
  }, [items, visibleRange])

  // Calculate total height for scrollbar
  const totalHeight = items.length * itemHeight

  // Handle scroll events
  const handleScroll = useCallback((e: { deltaY: number }) => {
    const newScrollTop = Math.max(
      0,
      Math.min(scrollTop + e.deltaY, totalHeight - height)
    )
    setScrollTop(newScrollTop)
    onScroll?.(newScrollTop)
  }, [scrollTop, totalHeight, height, onScroll])

  // Total content height (for spacer)
  const contentHeight = totalHeight

  // Selected item style
  const getItemStyle = useCallback((index: number) => {
    if (index === selectedIndex) {
      return { backgroundColor: 'blue', color: 'white' }
    }
    return {}
  }, [selectedIndex])

  return (
    <Box flexDirection="column" height={height} width={width} overflow="hidden">
      {/* Spacer for total scrollable height */}
      <Box height={contentHeight} flexDirection="column" position="relative">
        {/* Render visible items */}
        {visibleItems.map(({ item, index }) => {
          const offsetY = index * itemHeight
          const isSelected = index === selectedIndex
          
          return (
            <Box
              key={item.key}
              position="absolute"
              top={offsetY}
              left={0}
              right={0}
              height={itemHeight}
              onClick={() => onItemClick?.(item.data, index)}
            >
              {isSelected ? (
                <Text backgroundColor="blue" color="white">
                  {renderItem(item.data, index)}
                </Text>
              ) : (
                renderItem(item.data, index)
              )}
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

/**
 * Simplified virtual list for terminal (no true scrolling in Ink)
 */
export interface SimpleListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => string | React.ReactNode
  maxHeight?: number
  selectedIndex?: number
  onSelect?: (item: T, index: number) => void
}

export function SimpleList<T>({
  items,
  renderItem,
  maxHeight = 20,
  selectedIndex = -1,
  onSelect,
}: SimpleListProps<T>) {
  // Limit visible items
  const visibleItems = useMemo(() => {
    const maxItems = Math.min(items.length, maxHeight)
    if (items.length <= maxItems) {
      return items.map((item, index) => ({ item, index }))
    }
    
    // If there's a selection, try to center it
    if (selectedIndex >= 0) {
      const halfMax = Math.floor(maxItems / 2)
      const startIndex = Math.max(0, selectedIndex - halfMax)
      const endIndex = Math.min(items.length, startIndex + maxItems)
      
      if (endIndex - startIndex < maxItems) {
        return items.slice(
          Math.max(0, endIndex - maxItems),
          endIndex
        ).map((item, i) => ({ item, index: startIndex + i }))
      }
      
      return items.slice(startIndex, endIndex).map((item, i) => ({
        item,
        index: startIndex + i,
      }))
    }
    
    return items.slice(0, maxItems).map((item, index) => ({ item, index }))
  }, [items, maxHeight, selectedIndex])

  return (
    <Box flexDirection="column">
      {visibleItems.map(({ item, index }) => {
        const isSelected = index === selectedIndex
        
        if (typeof renderItem(item, index) === 'string') {
          return (
            <Box
              key={index}
              onClick={() => onSelect?.(item, index)}
            >
              {isSelected ? (
                <Text backgroundColor="blue" color="white">
                  {'> '}{renderItem(item, index)}
                </Text>
              ) : (
                <Text>
                  {'  '}{renderItem(item, index)}
                </Text>
              )}
            </Box>
          )
        }
        
        return (
          <Box
            key={index}
            onClick={() => onSelect?.(item, index)}
          >
            {isSelected ? (
              <Text backgroundColor="blue" color="white">
                {'> '}
              </Text>
            ) : (
              <Text>{'  '}</Text>
            )}
            {renderItem(item, index)}
          </Box>
        )
      })}
      
      {/* Show more indicator */}
      {items.length > maxHeight && (
        <Box>
          <Text dimColor>
            {selectedIndex >= 0
              ? `Showing ${visibleItems[0]?.index + 1}-${visibleItems[visibleItems.length - 1]?.index + 1} of ${items.length}`
              : `Showing ${items.length} items (use arrows to navigate)`}
          </Text>
        </Box>
      )}
    </Box>
  )
}

/**
 * Selectable list with keyboard navigation
 */
export interface SelectableListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => string
  onSelect: (item: T, index: number) => void
  onCancel?: () => void
  maxHeight?: number
  filter?: string
}

export function SelectableList<T>({
  items,
  renderItem,
  onSelect,
  onCancel,
  maxHeight = 10,
  filter = '',
}: SelectableListProps<T>) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Filter items
  const filteredItems = useMemo(() => {
    if (!filter) return items
    const lowerFilter = filter.toLowerCase()
    return items.filter((item, i) =>
      renderItem(item, i).toLowerCase().includes(lowerFilter)
    )
  }, [items, filter, renderItem])

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0)
  }, [filter])

  return (
    <Box flexDirection="column">
      <SimpleList
        items={filteredItems}
        renderItem={(item, index) => renderItem(item, index)}
        maxHeight={maxHeight}
        selectedIndex={selectedIndex}
        onSelect={(item, index) => onSelect(item, index)}
      />
    </Box>
  )
}

/**
 * Infinite scroll list (loads more items as needed)
 */
export interface InfiniteListProps<T> {
  items: T[]
  loadMore: () => Promise<void>
  hasMore: boolean
  isLoading: boolean
  renderItem: (item: T, index: number) => React.ReactNode
  renderLoading: () => React.ReactNode
  renderEnd: () => React.ReactNode
  itemHeight: number
  height: number
}

export function InfiniteList<T>({
  items,
  loadMore,
  hasMore,
  isLoading,
  renderItem,
  renderLoading,
  renderEnd,
  itemHeight,
  height,
}: InfiniteListProps<T>) {
  const [showLoadMore, setShowLoadMore] = useState(false)

  // Check if near bottom
  const handleScroll = useCallback(async (scrollTop: number) => {
    if (!hasMore || isLoading) return
    
    const scrollBottom = scrollTop + height
    const threshold = itemHeight * 3
    
    if (scrollBottom >= items.length * itemHeight - threshold) {
      setShowLoadMore(true)
      await loadMore()
      setShowLoadMore(false)
    }
  }, [hasMore, isLoading, items.length, itemHeight, height, loadMore])

  return (
    <Box flexDirection="column">
      <VirtualList
        items={items.map((item, index) => ({
          key: index,
          data: item,
          height: itemHeight,
        }))}
        renderItem={(item) => renderItem(item, items.indexOf(item))}
        itemHeight={itemHeight}
        height={height}
        onScroll={handleScroll}
      />
      
      {isLoading && (
        <Box>
          {renderLoading()}
        </Box>
      )}
      
      {!hasMore && items.length > 0 && (
        <Box>
          {renderEnd()}
        </Box>
      )}
    </Box>
  )
}

export default VirtualList
