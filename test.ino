
int data = 5;
int clock = 6;
int enable = 7;
void setup()
{
pinMode(data, OUTPUT);
pinMode(enable, OUTPUT);
pinMode(clock, OUTPUT);
displayOn(); // display defaults to off at power-up
}
void displayOn()
// turns on display
{
digitalWrite(enable, LOW);
shiftOut(data, clock, MSBFIRST, B00000001);
digitalWrite(enable, HIGH);
delay(10);
}
void loop()
{
displayOn();
delay(500);
}