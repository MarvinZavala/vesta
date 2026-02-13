import React from 'react';
import { View } from 'react-native';

interface AnimatedCardWrapperProps {
  children: React.ReactNode;
  index?: number;
  delay?: number;
  direction?: 'down' | 'right';
}

// Simple passthrough wrapper - animations disabled to prevent navigation crashes
export function AnimatedCardWrapper({
  children,
}: AnimatedCardWrapperProps) {
  return <View>{children}</View>;
}

export function AnimatedListItem({
  children,
}: {
  children: React.ReactNode;
  index?: number;
}) {
  return <View>{children}</View>;
}
