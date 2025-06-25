import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Check, X, Send, Moon, Sun, Bot } from 'lucide-react';

const CalendarApp = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSchedule, setNewSchedule] = useState({ 
    title: '', 
    date: new Date().toISOString().split('T')[0],
    time: null,
    description: '' 
  });
  const [addFormError, setAddFormError] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  
  // 다크모드 설정
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const savedDarkMode = localStorage.getItem('calendar_dark_mode');
      return savedDarkMode ? JSON.parse(savedDarkMode) : false;
    } catch (error) {
      console.error('다크모드 설정 로드 오류:', error);
      return false;
    }
  });
  
  const [loading, setLoading] = useState(false);
  
  // 일정 데이터
  const [schedules, setSchedules] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false); // 불러오기 완료 여부

  // 날짜를 YYYY-MM-DD 형식으로 변환하는 헬퍼 함수
  const formatDateToString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 컴포넌트 마운트 시 로컬 스토리지에서 데이터 로드
  useEffect(() => {
    try {
      const savedSchedules = localStorage.getItem('calendar_schedules');
      if (savedSchedules) {
        const parsed = JSON.parse(savedSchedules);
  
        const normalized = parsed.map(s => ({
          ...s,
          date: formatDateToString(parseDate(s.date)),
          time: s.time || null,
          completed: s.completed || false,
          description: s.description || ''
        }));
  
        setSchedules(normalized);
      }
    } catch (e) {
      console.error('일정 로딩 실패:', e);
    } finally {
      setIsLoaded(true); // 불러오기 완료
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) return; // 초기 로딩이 끝난 후에만 저장
    try {
      localStorage.setItem('calendar_schedules', JSON.stringify(schedules));
    } catch (e) {
      console.error('일정 저장 실패:', e);
    }
  }, [schedules, isLoaded]);

  // 다크모드 변경 시 로컬 스토리지에 저장
  useEffect(() => {
    try {
      localStorage.setItem('calendar_dark_mode', JSON.stringify(isDarkMode));
    } catch (error) {
      console.error('다크모드 설정 저장 오류:', error);
    }
  }, [isDarkMode]);

  // 날짜 문자열을 Date 객체로 안전하게 변환
  const parseDate = (dateString) => {
    if (!dateString) return new Date();
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(dateString)) {
      return new Date();
    }
    
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // GPT API 호출 함수
  const callGPTAPI = async (prompt) => {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    
    if (!apiKey?.trim()) {
      throw new Error('API 키가 설정되지 않았습니다. 환경 변수(REACT_APP_OPENAI_API_KEY)를 설정해주세요.');
    }

    const currentSchedulesText = schedules.length > 0 
      ? `현재 저장된 일정들:\n${schedules.map(s => {
          const scheduleDate = parseDate(s.date);
          return `- ${formatDateFull(scheduleDate)}: ${s.title} ${s.time ? `(${s.time})` : '(하루 종일)'}`;
        }).join('\n')}`
      : '현재 저장된 일정이 없습니다.';

    const systemPrompt = `당신은 캘린더 일정 관리 AI입니다. 사용자의 요청을 분석하여 JSON 형태로 응답해주세요.

현재 선택된 날짜: ${formatDateFull(selectedDate)}
오늘 날짜: ${formatDateFull(new Date())}

${currentSchedulesText}

응답 형식:
1. 일정 추가 요청시:
{
  "action": "add",
  "date": "YYYY-MM-DD",
  "title": "일정 제목",
  "time": "HH:MM" 또는 null (하루종일인 경우),
  "message": "사용자에게 보여줄 확인 메시지"
}

2. 일정 조회 요청시:
{
  "action": "query",
  "date": "YYYY-MM-DD",
  "message": "조회 결과 메시지"
}

3. 일정 삭제 요청시:
{
  "action": "delete",
  "date": "YYYY-MM-DD",
  "title": "삭제할 일정 제목 (부분 매칭)" 또는 null (해당 날짜 전체 삭제),
  "message": "삭제 확인 메시지"
}

4. 명령을 이해할 수 없는 경우:
{
  "action": "error",
  "message": "도움말 메시지"
}

날짜 표현 해석 예시:
- "오늘" → 오늘 날짜
- "내일" → 오늘 + 1일
- "다음주 월요일" → 다음주 월요일 날짜
- "3일 후" → 오늘 + 3일
- "7월 15일" → 올해 7월 15일 (이미 지났으면 내년)

시간 표현 해석 예시:
- "오후 3시" → "15:00"
- "오전 9시 30분" → "09:30"
- "14:30" → "14:30"
- 시간 언급이 없으면 null (하루종일)

JSON만 응답하고 다른 텍스트는 포함하지 마세요.`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          throw new Error('API 키가 유효하지 않습니다. 환경 변수에서 올바른 API 키를 설정해주세요.');
        }
        throw new Error(`API 오류: ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      try {
        return JSON.parse(content);
      } catch (parseError) {
        console.error('JSON 파싱 오류:', content);
        return {
          action: 'error',
          message: '응답을 처리하는 중 오류가 발생했습니다. 다시 시도해주세요.'
        };
      }
    } catch (error) {
      console.error('GPT API 오류:', error);
      throw error;
    }
  };

  // 명령 처리 함수
  const processCommand = async (message) => {
    try {
      const parsed = await callGPTAPI(message);
      
      if (parsed.action === "add") {
        const targetDate = parseDate(parsed.date);
        const dateString = formatDateToString(targetDate);
        const newSched = {
          id: Date.now(),
          date: dateString, // YYYY-MM-DD 형식으로 저장
          title: parsed.title,
          time: parsed.time || null,
          description: '',
          completed: false
        };
        setSchedules(prev => [...prev, newSched]);
        return parsed.message || `${formatDateFull(targetDate)}에 '${parsed.title}' 일정이 추가되었습니다.`;
        
      } else if (parsed.action === "query") {
        const targetDate = parseDate(parsed.date);
        const dateString = formatDateToString(targetDate);
        const targetSchedules = schedules.filter(s => s.date === dateString);
        
        if (targetSchedules.length > 0) {
          const scheduleList = targetSchedules.map(s => 
            `• ${s.title} ${s.time ? `(${s.time})` : '(하루 종일)'} ${s.completed ? '✓' : ''}`
          ).join('\n');
          return `${formatDateFull(targetDate)} 일정:\n${scheduleList}`;
        } else {
          return `${formatDateFull(targetDate)}에는 일정이 없습니다.`;
        }
        
      } else if (parsed.action === "delete") {
        const targetDate = parseDate(parsed.date);
        const dateString = formatDateToString(targetDate);
        const beforeCount = schedules.length;
        
        if (parsed.title) {
          // 특정 일정 삭제
          const filteredSchedules = schedules.filter(s => 
            s.date !== dateString || 
            !s.title.toLowerCase().includes(parsed.title.toLowerCase())
          );
          setSchedules(filteredSchedules);
          const deletedCount = beforeCount - filteredSchedules.length;
          
          if (deletedCount > 0) {
            return parsed.message || `${formatDateFull(targetDate)}의 '${parsed.title}' 관련 일정 ${deletedCount}개가 삭제되었습니다.`;
          } else {
            return `${formatDateFull(targetDate)}에서 '${parsed.title}' 관련 일정을 찾을 수 없습니다.`;
          }
        } else {
          // 해당 날짜의 모든 일정 삭제
          const dateScheduleCount = schedules.filter(s => s.date === dateString).length;
          setSchedules(schedules.filter(s => s.date !== dateString));
          
          if (dateScheduleCount > 0) {
            return parsed.message || `${formatDateFull(targetDate)}의 모든 일정 ${dateScheduleCount}개가 삭제되었습니다.`;
          } else {
            return `${formatDateFull(targetDate)}에는 삭제할 일정이 없습니다.`;
          }
        }
      } else {
        return parsed.message || "명령을 이해하지 못했습니다. 다시 시도해주세요.";
      }
    } catch (error) {
      return error.message;
    }
  };

  // 달력 렌더링을 위한 함수들
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatDateFull = (date) => {
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const isSameDay = (date1, date2) => {
    return formatDateToString(date1) === formatDateToString(date2);
  };

  // 일정 관리 함수들
  const addSchedule = (schedule) => {
    const scheduleDate = schedule.date ? parseDate(schedule.date) : selectedDate;
    const dateString = formatDateToString(scheduleDate);
    
    const newSched = {
      id: Date.now(),
      date: dateString, // YYYY-MM-DD 형식으로 저장
      title: schedule.title,
      time: schedule.time || null,
      description: schedule.description || '',
      completed: false
    };
    
    console.log('추가할 일정:', newSched); // 디버깅용
    setSchedules(prevSchedules => [...prevSchedules, newSched]);
    setNewSchedule({ 
      title: '', 
      date: new Date().toISOString().split('T')[0], 
      time: null,
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
    const dateString = formatDateToString(date);
    return schedules.filter(s => s.date === dateString);
  };

  // 채팅 제출 처리
  const handleChatSubmit = async () => {
    if (!chatMessage.trim() || loading) return;
  
    setLoading(true);
    const userMessage = { type: 'user', message: chatMessage };
    setChatHistory(prev => [...prev, userMessage]);
    
    try {
      const response = await processCommand(chatMessage);
      const botMessage = { type: 'bot', message: response };
      setChatHistory(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = { type: 'bot', message: '오류가 발생했습니다. 다시 시도해주세요.' };
      setChatHistory(prev => [...prev, errorMessage]);
    }
    
    setChatMessage('');
    setLoading(false);
  };

  // API 키 상태 확인 함수
  const hasApiKey = () => {
    return !!process.env.REACT_APP_OPENAI_API_KEY;
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`p-3 rounded-full transition-colors ${
                isDarkMode ? 'hover:bg-gray-900' : 'hover:bg-gray-100'
              }`}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
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
                  
                  <select
                    value={newSchedule.time || ''}
                    onChange={(e) => setNewSchedule({...newSchedule, time: e.target.value || null})}
                    className={`w-full p-3 rounded-lg border-0 text-sm mb-3 focus:outline-none ${
                      isDarkMode 
                        ? 'bg-black text-white' 
                        : 'bg-white text-black'
                    }`}
                  >
                    <option value="">All Day</option>
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
                <div className="text-red-500 text-sm mt-2">
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
                          {schedule.time ? schedule.time : '하루 종일'}
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
                {!hasApiKey() && (
                  <span className="text-xs bg-orange-500 text-white px-2 py-1 rounded">
                    API 키 필요
                  </span>
                )}
              </div>

              <div className={`h-40 overflow-y-auto mb-4 p-3 rounded-lg ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                {chatHistory.length === 0 ? (
                  <div className={`text-sm ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                    <p className="mb-2">💡 AI로 일정을 관리해보세요!</p>
                    <p className="text-xs">예시:</p>
                    <p className="text-xs">• "내일 오후 3시에 회의 일정 추가해줘"</p>
                    <p className="text-xs">• "다음주 화요일에 프레젠테이션 추가"</p>
                    <p className="text-xs">• "오늘 일정 알려줘"</p>
                    <p className="text-xs">• "3일 후에 병원 가기 추가해줘"</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {chatHistory.map((chat, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded text-sm ${
                          chat.type === 'user' 
                            ? (isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-black')
                            : (isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-blue-50 text-gray-700')
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {chat.type === 'bot' && <Bot size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />}
                          <div className="whitespace-pre-line">{chat.message}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="AI에게 일정 관리를 요청해보세요..."
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !loading && handleChatSubmit()}
                  disabled={loading}
                  className={`flex-1 p-3 rounded-lg border-0 text-sm focus:outline-none ${
                    isDarkMode 
                      ? 'bg-gray-900 text-white placeholder-gray-500' 
                      : 'bg-gray-100 text-black placeholder-gray-400'
                  } ${loading ? 'opacity-50' : ''}`}
                />
                <button
                  onClick={handleChatSubmit}
                  disabled={loading || !chatMessage.trim()}
                  className={`p-3 rounded-lg transition-colors ${
                    loading || !chatMessage.trim()
                      ? 'opacity-50 cursor-not-allowed'
                      : ''
                  } ${
                    isDarkMode 
                      ? 'bg-white text-black hover:bg-gray-200' 
                      : 'bg-black text-white hover:bg-gray-800'
                  }`}
                >
                  {loading ? '...' : <Send size={16} />}
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