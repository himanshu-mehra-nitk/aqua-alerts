const generateConservationTips = (avgUsage, threshold) => {
  const tips = [];
  
  if (avgUsage > threshold) {
    tips.push('🚨 Your usage is above threshold! Consider taking shorter showers.');
    tips.push('💧 Fix leaking faucets immediately - they can waste up to 20L per day!');
    tips.push('🌱 Water plants in early morning to reduce evaporation loss.');
  } else if (avgUsage > threshold * 0.8) {
    tips.push('⚠️ You\'re approaching your threshold. Try running full laundry loads.');
    tips.push('💡 Turn off tap while brushing - saves up to 6L per minute!');
    tips.push('🛁 Consider installing water-efficient showerheads.');
  } else {
    tips.push('✅ Great job! Your water usage is well managed.');
    tips.push('💧 Keep monitoring daily usage to maintain good habits.');
    tips.push('🌿 Consider collecting rainwater for gardening.');
  }
  
  tips.push('📊 Check for hidden leaks by monitoring your water meter.');
  tips.push('🚿 Limit shower time to 5 minutes to save water.');
  
  return tips;
};

module.exports = { generateConservationTips };