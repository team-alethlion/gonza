
export const businessGoalTips = [
  "💡 Tip: Break your monthly goal into daily targets. Small consistent actions lead to big results!",
  "🎯 Focus: Review your progress weekly and adjust your strategies based on what's working.",
  "🚀 Motivation: Every successful business started with a single sale. Keep pushing forward!",
  "📊 Strategy: Track your conversion rates to identify which sales approaches work best.",
  "💪 Mindset: Treat every 'no' as one step closer to your next 'yes'. Persistence pays off!",
  "🌟 Excellence: Quality over quantity - focus on building lasting customer relationships.",
  "⏰ Efficiency: Time-block your sales activities to maximize productivity and focus.",
  "🎉 Celebration: Acknowledge small wins along the way - they fuel motivation for bigger goals!",
  "📈 Growth: Analyze your best-performing days and replicate those successful patterns.",
  "🤝 Networking: Strong relationships with customers often lead to referrals and repeat business.",
  "💼 Professionalism: Your reputation is your most valuable asset - protect and nurture it.",
  "🔍 Analysis: Use data to guide your decisions, not just gut feelings.",
  "🎨 Creativity: Try new approaches to reach customers and stand out from competitors.",
  "⚡ Action: Don't wait for perfect conditions - take imperfect action and adjust as you go.",
  "🧠 Learning: Invest time in learning about your industry, customers, and sales techniques.",
  "🔄 Consistency: Show up daily - consistent effort compounds over time.",
  "👂 Listening: Your customers' feedback is gold. Listen carefully and adapt accordingly.",
  "📱 Reach: Leverage all available channels to maximize your market visibility.",
  "🧩 Solutions: Focus on solving problems for customers rather than just selling products.",
  "⚖️ Balance: Maintain a healthy work-life balance to prevent burnout and stay motivated.",
  "📝 Planning: End each day by preparing your top priorities for tomorrow.",
  "🌱 Growth: Invest in your skills - the best investment is in yourself.",
  "🤔 Reflection: Take time to reflect on what worked and what didn't each week.",
  "🏆 Excellence: Set standards higher than your competition to truly stand out.",
  "📣 Voice: Develop a unique brand voice that resonates with your target audience.",
  "📚 Knowledge: Know your products inside and out - expertise builds customer trust.",
  "🎭 Adaptability: Stay flexible and ready to pivot when market conditions change.",
  "🔗 Connection: Build genuine connections with customers beyond just transactions.",
  "🌐 Expansion: Consider new markets or segments that might benefit from your offerings.",
  "🙏 Gratitude: Express appreciation to your customers regularly - loyalty is earned."
];

/**
 * Returns a business goal tip based on the current date
 * Tips will rotate through the month, resetting each month
 */
export const getTodaysTip = (): string => {
  const today = new Date();
  const dayOfMonth = today.getDate() - 1; // 0-indexed (0-29)
  const tipIndex = dayOfMonth % businessGoalTips.length;
  return businessGoalTips[tipIndex];
};
