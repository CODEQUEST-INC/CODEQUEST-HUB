import React, { useEffect } from 'react';
import { View, Image, Text } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withSequence,
  withDelay,
  runOnJS
} from 'react-native-reanimated';

type SplashScreenProps = {
  onFinish: () => void;
};

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.8);

  useEffect(() => {
    // Fade in and scale up the logo
    opacity.value = withTiming(1, { duration: 800 });
    scale.value = withTiming(1, { duration: 800 });
    
    // Hold for 1.5 seconds after animation, then call onFinish
    const timer = setTimeout(() => {
      onFinish();
    }, 2300);
    
    return () => clearTimeout(timer);
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  return (
    <View className="flex-1 bg-white justify-center items-center">
      <Animated.View style={animatedStyle} className="items-center">
        <Image 
          source={require('../../assets/logo.png')} 
          style={{ width: 250, height: 250 }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
}
