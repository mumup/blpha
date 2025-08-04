import React from 'react';

interface SkeletonProps {
  /**
   * Whether the skeleton should be displayed
   */
  loading?: boolean;
  /**
   * Width of the skeleton
   */
  width?: string;
  /**
   * Height of the skeleton
   */
  height?: string;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Content to show when not loading
   */
  children?: React.ReactNode;
}

/**
 * Skeleton component inspired by Radix UI Themes
 * Replaces content with same shape placeholder that indicates a loading state
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  loading = true,
  width,
  height,
  className = '',
  children,
}) => {
  if (!loading && children) {
    return <>{children}</>;
  }

  const baseClasses = 'bg-gray-200 dark:bg-gray-700 rounded animate-pulse';
  const sizeClasses = width || height ? '' : 'h-4 w-full';
  
  const style: React.CSSProperties = {};
  if (width) style.width = width;
  if (height) style.height = height;

  return (
    <div 
      className={`${baseClasses} ${sizeClasses} ${className}`}
      style={style}
      aria-label="Loading..."
    >
      {loading && children && (
        <span className="invisible">{children}</span>
      )}
    </div>
  );
};

export default Skeleton;