export const calculateRackStats = (rack) => {
  const stats = {
    totalTanks: 0,
    totalFish: {
      MALE: 0,
      FEMALE: 0,
      LARVAE: 0,
      JUVENILE: 0
    },
    ageDistribution: {
      lessThan6Months: 0,
      oneToTwoYears: 0,
      twoToThreeYears: 0,
      overThreeYears: 0
    },
    totalFishCount: 0
  };

  if (!rack?.tanks) return stats;

  stats.totalTanks = rack.tanks.length;
  let totalFishCount = 0;

  rack.tanks.forEach(tank => {
    if (tank.subdivisions && Array.isArray(tank.subdivisions)) {
      tank.subdivisions.forEach(sub => {
        // Ensure gender is uppercase for consistency
        const gender = sub.gender?.toUpperCase();
        const count = parseInt(sub.count) || 0;
        totalFishCount += count;
        
        if (gender && gender in stats.totalFish) {
          stats.totalFish[gender] += count;
        }
      });

      // Calculate age distribution if dob is available
      if (tank.dob) {
        const dobDate = new Date(tank.dob);
        const today = new Date();
        const ageInMonths = (today - dobDate) / (1000 * 60 * 60 * 24 * 30.44); // Approximate months

        const fishCount = tank.subdivisions.reduce((sum, sub) => sum + (parseInt(sub.count) || 0), 0);
        
        if (ageInMonths > 36) { // Over 3 years
          stats.ageDistribution.overThreeYears += fishCount;
        } else if (ageInMonths > 24) { // Between 2-3 years
          stats.ageDistribution.twoToThreeYears += fishCount;
        } else if (ageInMonths > 12) { // Between 1-2 years
          stats.ageDistribution.oneToTwoYears += fishCount;
        } else if (ageInMonths <= 6) { // Less than 6 months
          stats.ageDistribution.lessThan6Months += fishCount;
        }
      }
    }
  });

  stats.totalFishCount = totalFishCount;
  
  // Calculate percentages
  if (totalFishCount > 0) {
    stats.ageDistribution.lessThan6MonthsPercent = (stats.ageDistribution.lessThan6Months / totalFishCount * 100).toFixed(1);
    stats.ageDistribution.oneToTwoYearsPercent = (stats.ageDistribution.oneToTwoYears / totalFishCount * 100).toFixed(1);
    stats.ageDistribution.twoToThreeYearsPercent = (stats.ageDistribution.twoToThreeYears / totalFishCount * 100).toFixed(1);
    stats.ageDistribution.overThreeYearsPercent = (stats.ageDistribution.overThreeYears / totalFishCount * 100).toFixed(1);
  }

  return stats;
};

// Function to calculate overall stats for all racks
export const calculateOverallStats = (racks) => {
  const overallStats = {
    totalTanks: 0,
    totalFish: {
      MALE: 0,
      FEMALE: 0,
      LARVAE: 0,
      JUVENILE: 0
    },
    ageDistribution: {
      lessThan6Months: 0,
      oneToTwoYears: 0,
      twoToThreeYears: 0,
      overThreeYears: 0
    },
    totalFishCount: 0
  };

  if (!racks || !Array.isArray(racks)) return overallStats;

  racks.forEach(rack => {
    const rackStats = calculateRackStats(rack);
    overallStats.totalTanks += rackStats.totalTanks;
    overallStats.totalFishCount += rackStats.totalFishCount;
    
    // Add fish counts by gender
    Object.keys(overallStats.totalFish).forEach(gender => {
      overallStats.totalFish[gender] += rackStats.totalFish[gender] || 0;
    });
    
    // Add age distribution counts
    overallStats.ageDistribution.lessThan6Months += rackStats.ageDistribution.lessThan6Months;
    overallStats.ageDistribution.oneToTwoYears += rackStats.ageDistribution.oneToTwoYears;
    overallStats.ageDistribution.twoToThreeYears += rackStats.ageDistribution.twoToThreeYears;
    overallStats.ageDistribution.overThreeYears += rackStats.ageDistribution.overThreeYears;
  });
  
  // Calculate overall percentages
  if (overallStats.totalFishCount > 0) {
    overallStats.ageDistribution.lessThan6MonthsPercent = (overallStats.ageDistribution.lessThan6Months / overallStats.totalFishCount * 100).toFixed(1);
    overallStats.ageDistribution.oneToTwoYearsPercent = (overallStats.ageDistribution.oneToTwoYears / overallStats.totalFishCount * 100).toFixed(1);
    overallStats.ageDistribution.twoToThreeYearsPercent = (overallStats.ageDistribution.twoToThreeYears / overallStats.totalFishCount * 100).toFixed(1);
    overallStats.ageDistribution.overThreeYearsPercent = (overallStats.ageDistribution.overThreeYears / overallStats.totalFishCount * 100).toFixed(1);
  }

  return overallStats;
};