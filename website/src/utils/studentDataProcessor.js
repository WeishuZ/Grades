// src/utils/studentDataProcessor.js

/**
 * Process student grades data into structured format for display
 * @param {Object} data - Raw grades data from API
 * @param {string} email - Student email
 * @param {string} name - Student name
 * @param {string} sortMode - 'assignment' or 'time'
 * @param {Object} classAverages - Class average percentages by category
 * @returns {Object} Processed student data
 */
export function processStudentData(data, email, name, sortMode = 'assignment', classAverages = {}, gradingConfig = {}) {
  if (!data || Object.keys(data).length === 0) return null;

  // Handle time-sorted data format
  if (sortMode === 'time' && data.sortBy === 'time' && Array.isArray(data.submissions)) {
    return processTimeSortedData(data.submissions, email, name, classAverages, gradingConfig);
  }

  // Handle assignment-sorted data format (original)
  return processAssignmentSortedData(data, email, name, classAverages, gradingConfig);
}

function normalizePointsMap(assignmentPoints = {}) {
  return Object.entries(assignmentPoints || {}).reduce((acc, [key, value]) => {
    const normalizedKey = String(key || '').trim().toLowerCase();
    if (!normalizedKey) return acc;
    acc[normalizedKey] = Number(value) || 0;
    return acc;
  }, {});
}

function getPointsForName(name, pointsMap) {
  const normalizedName = String(name || '').trim().toLowerCase();
  if (!normalizedName) return 0;
  return Number(pointsMap[normalizedName]) || 0;
}

function isAttendanceCategory(categoryName = '') {
  const normalized = String(categoryName).trim().toLowerCase();
  return normalized.includes('attendance');
}

function normalizeAssignmentScore(category, rawScore, rawMaxPoints) {
  if (isAttendanceCategory(category)) {
    return {
      score: rawScore > 0 ? 1 : 0,
      maxPoints: 1,
    };
  }

  return {
    score: rawScore,
    maxPoints: rawMaxPoints,
  };
}

/**
 * Process time-sorted submission data
 * @param {Array} submissions - Array of submissions
 * @param {string} email - Student email
 * @param {string} name - Student name
 * @param {Object} classAverages - Class average percentages by category
 */
function processTimeSortedData(submissions, email, name, classAverages = {}, gradingConfig = {}) {
  const categoriesData = {};
  const assignmentsList = [];
  let totalScore = 0;
  let totalMaxPoints = 0;
  const pointsMap = normalizePointsMap(gradingConfig.assignmentPoints);

  submissions.forEach((submission) => {
    const category = submission.category;
    const assignmentName = submission.name;
    const rawScore = parseFloat(submission.score) || 0;
    const rawMaxPoints = parseFloat(submission.maxPoints) || 0;
    const normalized = normalizeAssignmentScore(category, rawScore, rawMaxPoints);
    const score = normalized.score;
    const maxPoints = normalized.maxPoints;
    const percentage = maxPoints > 0 ? (score / maxPoints) * 100 : 0;
    const submissionTime = submission.submissionTime;
    const lateness = submission.lateness;

    // Skip Uncategorized assignments
    if (category === 'Uncategorized' || category === 'uncategorized') {
      return;
    }

    if (maxPoints > 0) {
      // Add to assignments list with time info
      const configuredAssignmentCap = getPointsForName(assignmentName, pointsMap);

      assignmentsList.push({
        category: category,
        name: assignmentName,
        score: score,
        maxPoints: maxPoints,
        capPoints: configuredAssignmentCap > 0 ? configuredAssignmentCap : maxPoints,
        percentage: percentage,
        submissionTime: submissionTime,
        lateness: lateness,
      });

      // Update category data
      if (!categoriesData[category]) {
        categoriesData[category] = {
          scores: [],
          total: 0,
          maxPoints: 0,
          count: 0,
        };
      }

      categoriesData[category].scores.push({
        name: assignmentName,
        score: score,
        maxPoints: maxPoints,
        capPoints: configuredAssignmentCap > 0 ? configuredAssignmentCap : maxPoints,
        percentage: percentage,
      });
      categoriesData[category].total += score;
      categoriesData[category].maxPoints += maxPoints;
      categoriesData[category].count++;
      totalMaxPoints += maxPoints;
    }
  });

  // Calculate category percentages and averages
  Object.keys(categoriesData).forEach(category => {
    const data = categoriesData[category];
    const configuredCategoryCap = getPointsForName(category, pointsMap);
    const assignmentCapSum = data.scores.reduce((sum, item) => sum + (Number(item.capPoints) || 0), 0);
    const categoryCap = configuredCategoryCap > 0
      ? configuredCategoryCap
      : (assignmentCapSum > 0 ? assignmentCapSum : data.maxPoints);

    const cappedTotal = categoryCap > 0
      ? Math.min(data.total, categoryCap)
      : data.total;

    data.capPoints = categoryCap;
    data.rawTotal = data.total;
    data.total = cappedTotal;
    data.percentage = categoryCap > 0 ? (cappedTotal / categoryCap) * 100 : 0;
    data.average = data.count > 0 ? data.total / data.count : 0;

    totalScore += cappedTotal;
  });

  const categoryPercentages = Object.values(categoriesData).map(d => d.percentage);
  const overallAvg = categoryPercentages.length > 0 
    ? parseFloat((categoryPercentages.reduce((sum, p) => sum + p, 0) / categoryPercentages.length).toFixed(2))
    : 0;

  const radarData = Object.entries(categoriesData).map(([category, data]) => ({
    category: category,
    percentage: parseFloat(data.percentage.toFixed(2)),
    score: parseFloat(data.total.toFixed(2)),
    maxPoints: parseFloat((data.capPoints ?? data.maxPoints).toFixed(2)),
    average: classAverages[category] || 0,
    fullMark: 100,
  }));

  const trendData = assignmentsList.map((a, idx) => ({
    index: idx + 1,
    name: `${a.category}-${a.name}`,
    percentage: a.percentage,
    category: a.category,
    submissionTime: a.submissionTime, // Include submission time for tooltip
  }));

  const totalCapPoints = Number(gradingConfig.totalCoursePoints) > 0
    ? Number(gradingConfig.totalCoursePoints)
    : totalMaxPoints;

  return {
    email: email,
    name: name,
    totalScore: totalScore,
    totalMaxPoints: totalMaxPoints,
    totalCapPoints,
    overallPercentage: totalCapPoints > 0 ? (totalScore / totalCapPoints) * 100 : 0,
    categoriesData: categoriesData,
    assignmentsList: assignmentsList,
    radarData: radarData,
    trendData: trendData,
  };
}

/**
 * Process assignment-sorted data (original logic)
 * @param {Object} data - Grades data grouped by category
 * @param {string} email - Student email
 * @param {string} name - Student name
 * @param {Object} classAverages - Class average percentages by category
 */
function processAssignmentSortedData(data, email, name, classAverages = {}, gradingConfig = {}) {
  const categoriesData = {};
  const assignmentsList = [];
  let totalScore = 0;
  let totalMaxPoints = 0;
  const pointsMap = normalizePointsMap(gradingConfig.assignmentPoints);

  Object.entries(data).forEach(([category, assignments]) => {
    // Skip Uncategorized assignments
    if (category === 'Uncategorized' || category === 'uncategorized') {
      return;
    }

    const categoryScores = [];
    let categoryTotal = 0;
    let categoryMax = 0;
    let categoryCount = 0;

    Object.entries(assignments).forEach(([assignmentName, assignmentData]) => {
      const rawScore = parseFloat(assignmentData.student) || 0;
      const rawMaxPoints = parseFloat(assignmentData.max) || 0;
      const normalized = normalizeAssignmentScore(category, rawScore, rawMaxPoints);
      const score = normalized.score;
      const maxPoints = normalized.maxPoints;
      const submissionTime = assignmentData.submissionTime;
      const lateness = assignmentData.lateness;
      
      if (maxPoints > 0) {
        const configuredAssignmentCap = getPointsForName(assignmentName, pointsMap);

        categoryScores.push({
          name: assignmentName,
          score: score,
          maxPoints: maxPoints,
          capPoints: configuredAssignmentCap > 0 ? configuredAssignmentCap : maxPoints,
          percentage: (score / maxPoints) * 100,
        });
        
        categoryTotal += score;
        categoryMax += maxPoints;
        categoryCount++;

        assignmentsList.push({
          category: category,
          name: assignmentName,
          score: score,
          maxPoints: maxPoints,
          capPoints: configuredAssignmentCap > 0 ? configuredAssignmentCap : maxPoints,
          percentage: (score / maxPoints) * 100,
          submissionTime: submissionTime,
          lateness: lateness,
        });
      }
    });

    if (categoryMax > 0) {
      const configuredCategoryCap = getPointsForName(category, pointsMap);
      const assignmentCapSum = categoryScores.reduce((sum, item) => sum + (Number(item.capPoints) || 0), 0);
      const categoryCap = configuredCategoryCap > 0
        ? configuredCategoryCap
        : (assignmentCapSum > 0 ? assignmentCapSum : categoryMax);

      categoriesData[category] = {
        scores: categoryScores,
        total: categoryTotal,
        maxPoints: categoryMax,
        capPoints: categoryCap,
        percentage: categoryCap > 0 ? (categoryTotal / categoryCap) * 100 : 0,
        count: categoryCount,
        average: categoryCount > 0 ? categoryTotal / categoryCount : 0,
      };

      totalMaxPoints += categoryMax;
    }
  });

  Object.keys(categoriesData).forEach(category => {
    const categoryData = categoriesData[category];
    const categoryCap = Number(categoryData.capPoints) || 0;
    const cappedTotal = categoryCap > 0
      ? Math.min(categoryData.total, categoryCap)
      : categoryData.total;

    categoryData.rawTotal = categoryData.total;
    categoryData.total = cappedTotal;
    categoryData.percentage = categoryCap > 0 ? (cappedTotal / categoryCap) * 100 : 0;

    totalScore += cappedTotal;
  });

  const categoryPercentages = Object.values(categoriesData).map(d => d.percentage);
  const overallAvg = categoryPercentages.length > 0 
    ? parseFloat((categoryPercentages.reduce((sum, p) => sum + p, 0) / categoryPercentages.length).toFixed(2))
    : 0;

  const radarData = Object.entries(categoriesData).map(([category, data]) => ({
    category: category,
    percentage: parseFloat(data.percentage.toFixed(2)),
    score: parseFloat(data.total.toFixed(2)),
    maxPoints: parseFloat((data.capPoints ?? data.maxPoints).toFixed(2)),
    average: classAverages[category] || 0,
    fullMark: 100,
  }));

  const trendData = assignmentsList.map((a, idx) => ({
    index: idx + 1,
    name: `${a.category}-${a.name}`,
    percentage: a.percentage,
    category: a.category,
    submissionTime: a.submissionTime || null, // Include for consistency
  }));

  const totalCapPoints = Number(gradingConfig.totalCoursePoints) > 0
    ? Number(gradingConfig.totalCoursePoints)
    : totalMaxPoints;

  return {
    email: email,
    name: name,
    totalScore: totalScore,
    totalMaxPoints: totalMaxPoints,
    totalCapPoints,
    overallPercentage: totalCapPoints > 0 ? (totalScore / totalCapPoints) * 100 : 0,
    categoriesData: categoriesData,
    assignmentsList: assignmentsList,
    radarData: radarData,
    trendData: trendData,
  };
}

/**
 * Get grade level based on percentage
 * @param {number} percentage - Score percentage
 * @returns {Object} Grade info with grade letter and color
 */
export function getGradeLevel(percentage) {
  if (percentage >= 90) return { grade: 'A', color: '#4caf50' };
  if (percentage >= 80) return { grade: 'B', color: '#8bc34a' };
  if (percentage >= 70) return { grade: 'C', color: '#ffc107' };
  if (percentage >= 60) return { grade: 'D', color: '#ff9800' };
  return { grade: 'F', color: '#f44336' };
}
