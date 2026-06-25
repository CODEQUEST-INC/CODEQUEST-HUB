import React, { useEffect } from 'react';
import { View, Image, Text } from 'react-native';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  withRepeat,
  Easing
} from 'react-native-reanimated';

type SplashScreenProps = {
  onFinish: () => void;
};

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const entranceOpacity = useSharedValue(0);
  const entranceScale = useSharedValue(0.8);
  const spinValue = useSharedValue(0);
  const floatValue = useSharedValue(0);

  useEffect(() => {
    // Entrance animation
    entranceOpacity.value = withTiming(1, { duration: 1000 });
    entranceScale.value = withTiming(1, { duration: 1000 });
    
    // Continuous rotation for the "border"
    spinValue.value = withRepeat(
      withTiming(360, { duration: 6000, easing: Easing.linear }),
      -1,
      false
    );

    // Floating blobs
    floatValue.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
    
    // Total duration before finish
    const timer = setTimeout(() => {
      onFinish();
    }, 4500); 
    
    return () => clearTimeout(timer);
  }, []);

  const cardEntranceStyle = useAnimatedStyle(() => {
    return {
      opacity: entranceOpacity.value,
      transform: [{ scale: entranceScale.value }],
    };
  });

  const spinStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${spinValue.value}deg` }],
    };
  });

  const aurora1Style = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: floatValue.value * 40 - 20 },
        { translateY: floatValue.value * 40 - 20 },
        { scale: 1 + floatValue.value * 0.2 }
      ]
    };
  });

  const aurora2Style = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: -floatValue.value * 50 + 25 },
        { translateY: -floatValue.value * 30 + 15 },
        { scale: 1.2 - floatValue.value * 0.3 }
      ]
    };
  });

  return (
    <View className="flex-1 bg-slate-100 dark:bg-slate-950 justify-center items-center overflow-hidden">
      
      {/* Background Aurora Blobs */}
      <Animated.View style={aurora1Style} className="absolute w-96 h-96 bg-brand-purple/40 dark:bg-brand-purple/30 rounded-full blur-[80px] top-10 -left-20" />
      <Animated.View style={aurora2Style} className="absolute w-80 h-80 bg-brand-orange/40 dark:bg-brand-orange/30 rounded-full blur-[80px] bottom-10 -right-10" />

      {/* Main Glass Card */}
      <Animated.View style={cardEntranceStyle} className="items-center justify-center relative p-[3px] rounded-[44px] shadow-2xl">
        
        {/* Spinning Gradient Border Background */}
        <View className="absolute inset-0 rounded-[44px] overflow-hidden opacity-80">
           <Animated.View style={[spinStyle, { width: '200%', height: '200%', top: '-50%', left: '-50%', position: 'absolute' }]} className="flex-row flex-wrap blur-[10px]">
             {/* Gradient segments */}
             <View className="w-1/2 h-1/2 bg-blue-500" />
             <View className="w-1/2 h-1/2 bg-brand-purple" />
             <View className="w-1/2 h-1/2 bg-brand-orange" />
             <View className="w-1/2 h-1/2 bg-pink-500" />
           </Animated.View>
        </View>

        {/* Inner Glass Container */}
        <View className="bg-white/90 dark:bg-slate-900/90 rounded-[41px] p-8 items-center justify-center w-[300px] h-[300px]">
          <Image 
            source={require('../../assets/logo.png')} 
            style={{ width: 160, height: 160 }}
            resizeMode="contain"
          />
          <Text className="text-2xl font-black text-slate-800 dark:text-white mt-6 tracking-widest uppercase">
            CodeQuest
          </Text>
          <Text className="text-sm font-bold text-brand-purple dark:text-brand-lightPurple mt-1 tracking-widest uppercase">
            Hub
          </Text>
        </View>
      </Animated.View>
      
    </View>
  );
}
