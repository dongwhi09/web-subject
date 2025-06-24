import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Check, X, Send, Moon, Sun, Bot } from 'lucide-react';

const CalendarApp = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ 
    title: '', 
    date: new Date().toISOString().split('T')[0], // 오늘 날짜로 초기화
    time: null, // 시간은 선택사항으로 null로 초기화
    description: '' 
  });
  const [addFormError, setAddFormError] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Load schedules from localStorage into initial state
  const savedSchedules = localStorage.getItem('schedules');
  const initialSchedules = savedSchedules ? JSON.parse(savedSchedules) : [];
  const [schedules, setSchedules] = useState(initialSchedules);

  // This useEffect is no longer needed since we load schedules in initial state
  useEffect(() => {
    // No longer needed
  }, []);

  useEffect(() => {
    localStorage.setItem('schedules', JSON.stringify(schedules));
  }, [schedules]);

  // 날짜 파싱 함수
  const parseDate = (dateString) => {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    // 오늘, 내일, 모레 등의 상대적 날짜
    if (dateString.includes('오늘')) {
      return new Date(today);
    } else if (dateString.includes('내일')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return tomorrow;
    } else if (dateString.includes('모레')) {
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(today.getDate() + 2);
      return dayAfterTomorrow;
    }
    
    // 월일 패턴 (예: 6월 26일, 12월 25일)
    const monthDayPattern = /(\d{1,2})월\s*(\d{1,2})일/;
    const monthDayMatch = dateString.match(monthDayPattern);
    if (monthDayMatch) {
      const month = parseInt(monthDayMatch[1]) - 1; // JavaScript 월은 0부터 시작
      const day = parseInt(monthDayMatch[2]);
      return new Date(currentYear, month, day);
    }
    
    // 요일 패턴 (예: 다음 주 화요일, 이번 주 금요일)
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const dayPattern = new RegExp(`(다음\\s*주|이번\\s*주)?\\s*(${dayNames.join('|')})`);
    const dayMatch = dateString.match(dayPattern);
    if (dayMatch) {
      const isNextWeek = dayMatch[1] && dayMatch[1].includes('다음');
      const targetDay = dayNames.indexOf(dayMatch[2]);
      const currentDay = today.getDay();
      
      let daysToAdd = targetDay - currentDay;
      if (isNextWeek || daysToAdd <= 0) {
        daysToAdd += 7;
      }
      
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysToAdd);
      return targetDate;
    }
    
    // 숫자 패턴 (예: 26일)
    const dayOnlyPattern = /(\d{1,2})일/;
    const dayOnlyMatch = dateString.match(dayOnlyPattern);
    if (dayOnlyMatch) {
      const day = parseInt(dayOnlyMatch[1]);
      const targetDate = new Date(currentYear, today.getMonth(), day);
      
      // 만약 해당 날짜가 이미 지났다면 다음 달로 설정
      if (targetDate < today) {
        targetDate.setMonth(today.getMonth() + 1);
      }
      
      return targetDate;
    }
    
    return null;
  };

  // OpenAI API 호출 함수
  const callOpenAI = async (userMessage) => {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are a calendar assistant. You help users manage their schedules. 
              Current date: ${new Date().toDateString()}
              Selected date: ${selectedDate.toDateString()}
              Current schedules for selected date: ${JSON.stringify(getSchedulesForDate(selectedDate))}
              
              You can perform these actions:
              1. ADD_SCHEDULE: Add a new schedule
              2. DELETE_SCHEDULE: Delete schedules
              3. LIST_SCHEDULES: Show schedules
              4. UPDATE_SCHEDULE: Update existing schedule
              
              Always respond in JSON format with this structure:
              {
                "action": "ADD_SCHEDULE|DELETE_SCHEDULE|LIST_SCHEDULES|UPDATE_SCHEDULE|GENERAL_RESPONSE",
                "data": {
                  "title": "event title",
                  "time": "HH:MM",
                  "description": "description",
                  "dateString": "original date string from user message (if any)",
                  "scheduleId": "id for update/delete"
                },
                "message": "User-friendly response message in Korean"
              }
              
              IMPORTANT: For ADD_SCHEDULE, if user mentions a specific date (like "6월 26일", "내일", "다음 주 화요일"), 
              include the original date string in "dateString" field so the system can parse it correctly.
              
              Examples:
              - "6월 26일에 회의" -> dateString: "6월 26일"
              - "내일 점심약속" -> dateString: "내일"  
              - "다음 주 화요일 발표" -> dateString: "다음 주 화요일"
              
              For general questions or when no specific action is needed, use "GENERAL_RESPONSE".
              Always include a helpful Korean message.`
            },
            {
              role: 'user',
              content: userMessage
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error('OpenAI API Error:', error);
      return {
        action: 'GENERAL_RESPONSE',
        message: 'AI 서비스에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.'
      };
    }
  };

  // 달력 렌더링을 위한 함수들
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('ko-KR', {
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateFull = (date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isSameDay = (date1, date2) => {
    return date1.toDateString() === date2.toDateString();
  };

  // 일정 관리 함수들
  const addSchedule = (schedule, targetDate = null) => {
    // targetDate가 있으면 사용하고, 없으면 schedule.date 또는 selectedDate 사용
    let scheduleDate;
    if (targetDate) {
      scheduleDate = targetDate;
    } else if (schedule.date) {
      scheduleDate = new Date(schedule.date);
    } else {
      scheduleDate = selectedDate;
    }
    
    const newSched = {
      id: Date.now(),
      date: scheduleDate.toDateString(),
      title: schedule.title,
      time: schedule.time,
      description: schedule.description || '',
      completed: false
    };
    setSchedules(prevSchedules => [...prevSchedules, newSched]);
    setNewSchedule({ 
      title: '', 
      date: new Date().toISOString().split('T')[0], 
      time: '09:00', 
      description: '' 
    });
    setShowAddForm(false);
    return newSched;
  };

  const toggleScheduleComplete = (id) => {
    setSchedules(prevSchedules => prevSchedules.map(s => 
      s.id === id ? { ...s, completed: !s.completed } : s
    ));
  };

  const deleteSchedule = (id) => {
    setSchedules(prevSchedules => prevSchedules.filter(s => s.id !== id));
  };

  const getSchedulesForDate = (date) => {
    return schedules.filter(s => s.date === date.toDateString());
  };

  // AI 응답 처리 함수
  const processAIResponse = (aiResponse) => {
    let responseMessage = aiResponse.message;

    switch (aiResponse.action) {
      case 'ADD_SCHEDULE':
        if (aiResponse.data && aiResponse.data.title) {
          let targetDate = selectedDate;
          
          // 사용자가 특정 날짜를 언급했다면 해당 날짜로 파싱
          if (aiResponse.data.dateString) {
            const parsedDate = parseDate(aiResponse.data.dateString);
            if (parsedDate) {
              targetDate = parsedDate;
            }
          }
          
          const newSched = addSchedule({
            title: aiResponse.data.title,
            time: aiResponse.data.time || '09:00',
            description: aiResponse.data.description || ''
          }, targetDate);
          
          const dateStr = targetDate.toLocaleDateString('ko-KR', { 
            month: 'long', 
            day: 'numeric' 
          });
          
          responseMessage = `✅ "${newSched.title}" 일정이 ${dateStr} ${newSched.time}에 추가되었습니다.`;
        }
        break;

      case 'DELETE_SCHEDULE':
        const todaySchedules = getSchedulesForDate(selectedDate);
        if (todaySchedules.length > 0) {
          setSchedules(schedules.filter(s => s.date !== selectedDate.toDateString()));
          responseMessage = `🗑️ ${formatDate(selectedDate)} 일정이 모두 삭제되었습니다.`;
        } else {
          responseMessage = '삭제할 일정이 없습니다.';
        }
        break;

      case 'LIST_SCHEDULES':
        const currentSchedules = getSchedulesForDate(selectedDate);
        if (currentSchedules.length > 0) {
          responseMessage = `📅 ${formatDate(selectedDate)} 일정:\n${currentSchedules.map(s => 
            `• ${s.title} (${s.time}) ${s.completed ? '✅' : '⏰'}`
          ).join('\n')}`;
        } else {
          responseMessage = `${formatDate(selectedDate)}에는 일정이 없습니다.`;
        }
        break;

      case 'GENERAL_RESPONSE':
      default:
        // 이미 aiResponse.message가 설정되어 있음
        break;
    }

    return responseMessage;
  };

  // 채팅 제출 처리
  const handleChatSubmit = async () => {
    if (!chatMessage.trim()) return;

    const userMessage = { type: 'user', message: chatMessage };
    setChatHistory([...chatHistory, userMessage]);
    setChatMessage('');
    setIsAiLoading(true);

    try {
      // AI API 호출
      const aiResponse = await callOpenAI(chatMessage);
      const responseMessage = processAIResponse(aiResponse);
      
      const botMessage = { 
        type: 'bot', 
        message: responseMessage,
        isAI: true
      };
      
      setChatHistory(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = { 
        type: 'bot', 
        message: '죄송합니다. 요청을 처리하는 중 오류가 발생했습니다.',
        isAI: true
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // 미리 정의된 시간 옵션들
  const timeOptions = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00', '21:30', '22:00'
  ];

  // 달력 렌더링
  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // 빈 칸 추가
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-12"></div>);
    }

    // 날짜 추가
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const hasSchedules = getSchedulesForDate(date).length > 0;
      const isSelected = isSameDay(date, selectedDate);
      const isToday = isSameDay(date, new Date());

      let dayClasses = "h-12 flex items-center justify-center cursor-pointer transition-all duration-150 relative font-medium";
      
      if (isSelected) {
        dayClasses += isDarkMode ? " bg-white text-black rounded-full" : " bg-black text-white rounded-full";
      } else if (isToday) {
        dayClasses += isDarkMode ? " text-white" : " text-black";
      } else {
        dayClasses += isDarkMode ? " text-gray-400 hover:text-white" : " text-gray-400 hover:text-black";
      }

      days.push(
        <div
          key={day}
          onClick={() => setSelectedDate(date)}
          className={dayClasses}
        >
          {day}
          {hasSchedules && (
            <div className={`absolute bottom-1 w-1 h-1 rounded-full ${
              isSelected 
                ? (isDarkMode ? 'bg-black' : 'bg-white')
                : (isDarkMode ? 'bg-white' : 'bg-black')
            }`}></div>
          )}
        </div>
      );
    }

    return days;
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-black text-white' : 'bg-white text-black'}`}>
      <div className="max-w-6xl mx-auto p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-light tracking-tight">AI Calendar</h1>
            <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {formatDateFull(selectedDate)}
            </p>
          </div>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-3 rounded-full transition-colors ${
              isDarkMode ? 'hover:bg-gray-900' : 'hover:bg-gray-100'
            }`}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* 달력 */}
          <div className="col-span-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-light">
                {currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
                  className={`p-2 rounded-full transition-colors ${
                    isDarkMode ? 'hover:bg-gray-900' : 'hover:bg-gray-100'
                  }`}
                >
                  <ChevronLeft size={18} />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className={`px-4 py-2 text-sm rounded-full transition-colors ${
                    isDarkMode ? 'hover:bg-gray-900' : 'hover:bg-gray-100'
                  }`}
                >
                  Today
                </button>
                <button
                  onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
                  className={`p-2 rounded-full transition-colors ${
                    isDarkMode ? 'hover:bg-gray-900' : 'hover:bg-gray-100'
                  }`}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-4">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                <div key={day + index} className={`text-center text-sm py-3 font-medium ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {renderCalendar()}
            </div>
          </div>

          {/* 사이드바 */}
          <div className="col-span-4 space-y-6">
            {/* 일정 목록 */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-light">Events</h3>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className={`p-2 rounded-full transition-colors ${
                    isDarkMode ? 'hover:bg-gray-900' : 'hover:bg-gray-100'
                  }`}
                >
                  <Plus size={18} />
                </button>
              </div>

              {showAddForm && (
                <div className={`mb-6 p-4 rounded-lg ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                  <input
                    type="text"
                    placeholder="Event title"
                    value={newSchedule.title}
                    onChange={(e) => setNewSchedule({...newSchedule, title: e.target.value})}
                    className={`w-full p-3 rounded-lg border-0 text-sm mb-3 focus:outline-none ${
                      isDarkMode 
                        ? 'bg-black text-white placeholder-gray-500' 
                        : 'bg-white text-black placeholder-gray-400'
                    }`}
                  />
                  
                  {/* 날짜 선택 */}
                  <input
                    type="date"
                    value={newSchedule.date}
                    onChange={(e) => setNewSchedule({...newSchedule, date: e.target.value})}
                    className={`w-full p-3 rounded-lg border-0 text-sm mb-3 focus:outline-none ${
                      isDarkMode 
                        ? 'bg-black text-white' 
                        : 'bg-white text-black'
                    }`}
                  />
                  
                  {/* 시간 선택 드롭다운 */}
                  <select
                    value={newSchedule.time || ''}
                    onChange={(e) => setNewSchedule({...newSchedule, time: e.target.value})}
                    className={`w-full p-3 rounded-lg border-0 text-sm mb-3 focus:outline-none ${
                      isDarkMode 
                        ? 'bg-black text-white' 
                        : 'bg-white text-black'
                    }`}
                  >
                    {timeOptions.map(time => (
                      <option key={time} value={time}>{time}</option>
                    ))}
                  </select>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (!newSchedule.title.trim()) {
                          setAddFormError('일정 제목을 입력해주세요');
                          return;
                        }
                        setAddFormError('');
                        addSchedule(newSchedule);
                      }}
                      className={`flex-1 py-2 text-sm rounded-lg transition-colors ${
                        isDarkMode 
                          ? 'bg-white text-black hover:bg-gray-200' 
                          : 'bg-black text-white hover:bg-gray-800'
                      }`}
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                        isDarkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-200'
                      }`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {addFormError && (
                <div className={`text-red-500 text-sm mt-2 ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}>
                  {addFormError}
                </div>
              )}

              <div className="space-y-2">
                {getSchedulesForDate(selectedDate).map(schedule => (
                  <div
                    key={schedule.id}
                    className={`p-3 rounded-lg transition-all ${
                      schedule.completed 
                        ? (isDarkMode ? 'bg-gray-900 opacity-60' : 'bg-gray-50 opacity-60')
                        : (isDarkMode ? 'bg-gray-900' : 'bg-gray-50')
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className={`font-medium ${schedule.completed ? 'line-through' : ''}`}>
                          {schedule.title}
                        </h4>
                        <p className={`text-sm mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {schedule.time ? schedule.time : 'All Day'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleScheduleComplete(schedule.id)}
                          className={`p-1 rounded transition-colors ${
                            schedule.completed 
                              ? 'text-green-500' 
                              : isDarkMode ? 'text-gray-500 hover:text-white' : 'text-gray-400 hover:text-black'
                          }`}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => deleteSchedule(schedule.id)}
                          className={`p-1 rounded transition-colors ${
                            isDarkMode ? 'text-gray-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'
                          }`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {getSchedulesForDate(selectedDate).length === 0 && (
                  <p className={`text-center py-8 text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    No events today
                  </p>
                )}
              </div>
            </div>

            {/* AI 채팅 */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Bot size={18} className="text-blue-500" />
                <h3 className="text-lg font-light">AI Assistant</h3>
              </div>

              <div className={`h-40 overflow-y-auto mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                {chatHistory.length === 0 ? (
                  <div className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    <p className="mb-2">💡 AI로 일정을 관리해보세요!</p>
                    <p className="text-xs">예시:</p>
                    <p className="text-xs">• "내일 3시에 회의 일정 추가해줘"</p>
                    <p className="text-xs">• "다음 주 화요일 발표 준비"</p>
                    <p className="text-xs">• "오늘 일정 알려줘"</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {chatHistory.map((chat, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${
                          chat.type === 'user' 
                            ? (isDarkMode ? 'bg-gray-800' : 'bg-gray-100')
                            : (isDarkMode ? 'bg-gray-900' : 'bg-gray-50')
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {chat.type === 'user' ? (
                            <div className={`w-6 h-6 rounded-full ${isDarkMode ? 'bg-gray-700' : 'bg-gray-300'}`} />
                          ) : (
                            <Bot size={16} className="text-blue-500" />
                          )}
                          <p className={`text-sm ${
                            chat.type === 'user' ? (isDarkMode ? 'text-white' : 'text-black') : (isDarkMode ? 'text-gray-400' : 'text-gray-500')
                          }`}>
                            {chat.message}
                          </p>
                        </div>
                      </div>
                    ))}
                    {isAiLoading && (
                      <div className={`text-sm p-2 rounded max-w-[85%] ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border-l-2 border-blue-500`}>
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-500"></div>
                          <span>AI가 생각중...</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="AI에게 일정 관리를 요청해보세요..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isAiLoading && handleChatSubmit()}
                  disabled={isAiLoading}
                  className={`flex-1 p-3 rounded-lg border-0 text-sm focus:outline-none ${
                    isDarkMode 
                      ? 'bg-gray-900 text-white placeholder-gray-500' 
                      : 'bg-gray-100 text-black placeholder-gray-400'
                  } ${isAiLoading ? 'opacity-50' : ''}`}
                />
                <button
                  onClick={handleChatSubmit}
                  disabled={isAiLoading || !chatMessage.trim()}
                  className={`p-3 rounded-lg transition-colors ${
                    isDarkMode 
                      ? 'bg-white text-black hover:bg-gray-200' 
                      : 'bg-black text-white hover:bg-gray-800'
                  } ${isAiLoading || !chatMessage.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isAiLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarApp;