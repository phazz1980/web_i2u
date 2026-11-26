/* Тестовый скетч ino2ubi: очередь треков с проверкой ролей, комментариев, массивов и указателей */
#include <Arduino.h>

#define MAX_VOLUME 30        // par максимальная громкость
#define DEBUG_NAME "test"

const uint16_t _DFP_BUF_LIMIT = 100;
uint16_t _dfp_queue[_DFP_BUF_LIMIT];
uint16_t* _dfp_ptr = nullptr;   // указатель на очередь
static uint8_t* _dfp_tmp;

bool door = false;       // in датчик двери
int button = 0;          // in кнопка
int relay = 0;           // out реле
float level = 0.0;       // out уровень
int volume = 10;         // par громкость по умолчанию
uint32_t period = 500;   // par период опроса, мс
unsigned long lastTick = 0;
int counter = 0;
String name = "track";

void setup() {
  _dfp_ptr = _dfp_queue;
  relay = 0;
}

int nextTrack(int current) {
  return (current + 1) % _DFP_BUF_LIMIT;
}

void loop() {
  if (millis() - lastTick >= period) {
    lastTick = millis();
    if (door) {
      counter = nextTrack(counter);
      _dfp_queue[counter] = counter;
      relay = 1;
    } else {
      relay = 0;
    }
    level = volume * 1.0 / MAX_VOLUME;
  }
}

void resetCounter() {
  counter = 0;
}
