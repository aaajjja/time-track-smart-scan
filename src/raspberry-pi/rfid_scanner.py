
"""
RFID Scanner Script for Raspberry Pi
-----------------------------------
This script would run on a Raspberry Pi connected to a PN532 NFC/RFID reader.
It reads RFID cards and sends the UID to the Firebase database.

Hardware Required:
- Raspberry Pi (any model with GPIO)
- PN532 NFC RFID Module (13.56MHz)
- Jumper wires
- Optional: LED indicators and/or buzzer for feedback

Wiring Diagram for PN532 with SPI:
- PN532 VCC -> Raspberry Pi 3.3V
- PN532 GND -> Raspberry Pi GND
- PN532 SCK -> Raspberry Pi SCLK (GPIO11)
- PN532 MISO -> Raspberry Pi MISO (GPIO9)
- PN532 MOSI -> Raspberry Pi MOSI (GPIO10)
- PN532 SS -> Raspberry Pi CE0 (GPIO8)

Optional LEDs:
- Success LED -> GPIO17 (with appropriate resistor)
- Error LED -> GPIO27 (with appropriate resistor)
- Buzzer -> GPIO22
"""

import time
import RPi.GPIO as GPIO
import board
import busio
from adafruit_pn532.spi import PN532_SPI
import firebase_admin
from firebase_admin import credentials
from firebase_admin import firestore
import datetime
import requests
import json

# Optional: Set up LED pins for feedback
SUCCESS_LED = 17
ERROR_LED = 27
BUZZER = 22

# Setup Firebase
cred = credentials.Certificate("/path/to/serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

def setup():
    """Set up the hardware."""
    # GPIO setup for feedback LEDs/buzzer
    GPIO.setmode(GPIO.BCM)
    GPIO.setup(SUCCESS_LED, GPIO.OUT)
    GPIO.setup(ERROR_LED, GPIO.OUT)
    GPIO.setup(BUZZER, GPIO.OUT)
    
    # Initialize SPI bus
    spi = busio.SPI(board.SCK, board.MOSI, board.MISO)
    cs_pin = board.D8  # CE0
    
    # Create PN532 object
    pn532 = PN532_SPI(spi, cs_pin)
    
    # Configure PN532
    pn532.SAM_configuration()
    
    print("PN532 NFC RFID Scanner Initialized")
    return pn532

def provide_feedback(success):
    """Provide visual/audio feedback based on scan result."""
    if success:
        GPIO.output(SUCCESS_LED, GPIO.HIGH)
        # Short beep for success
        GPIO.output(BUZZER, GPIO.HIGH)
        time.sleep(0.1)
        GPIO.output(BUZZER, GPIO.LOW)
        time.sleep(0.5)
        GPIO.output(SUCCESS_LED, GPIO.LOW)
    else:
        GPIO.output(ERROR_LED, GPIO.HIGH)
        # Two beeps for error
        for _ in range(2):
            GPIO.output(BUZZER, GPIO.HIGH)
            time.sleep(0.1)
            GPIO.output(BUZZER, GPIO.LOW)
            time.sleep(0.1)
        time.sleep(0.5)
        GPIO.output(ERROR_LED, GPIO.LOW)

def get_user_by_card_uid(card_uid):
    """Get user information from Firebase based on card UID."""
    users_ref = db.collection('users')
    query = users_ref.where('cardUID', '==', card_uid).limit(1)
    results = query.get()
    
    for doc in results:
        user_data = doc.to_dict()
        user_data['id'] = doc.id
        return user_data
    
    return None

def determine_action(user_id, user_name):
    """Determine the appropriate action based on today's attendance record."""
    today = datetime.datetime.now().strftime('%Y-%m-%d')
    now = datetime.datetime.now().strftime('%I:%M %p')  # 12-hour format with AM/PM
    
    record_ref = db.collection('attendance').document(f"{user_id}_{today}")
    record = record_ref.get()
    
    if not record.exists:
        # No record for today, create new with Time In AM
        record_data = {
            'userId': user_id,
            'userName': user_name,
            'date': today,
            'timeInAM': now
        }
        record_ref.set(record_data)
        return {
            'success': True,
            'action': 'Time In AM',
            'time': now,
            'message': f"Welcome {user_name}! Time In AM recorded at {now}"
        }
    
    # Record exists, update based on what's already there
    record_data = record.to_dict()
    
    if not record_data.get('timeOutAM'):
        # Has Time In AM but no Time Out AM
        record_ref.update({'timeOutAM': now})
        return {
            'success': True,
            'action': 'Time Out AM',
            'time': now,
            'message': f"Goodbye {user_name}! Time Out AM recorded at {now}"
        }
    
    if not record_data.get('timeInPM'):
        # Has AM records but no Time In PM
        record_ref.update({'timeInPM': now})
        return {
            'success': True,
            'action': 'Time In PM',
            'time': now,
            'message': f"Welcome back {user_name}! Time In PM recorded at {now}"
        }
    
    if not record_data.get('timeOutPM'):
        # Has Time In PM but no Time Out PM
        record_ref.update({'timeOutPM': now})
        return {
            'success': True,
            'action': 'Time Out PM',
            'time': now,
            'message': f"Goodbye {user_name}! Time Out PM recorded at {now}. See you tomorrow!"
        }
    
    # All slots are filled for today
    return {
        'success': False,
        'action': 'Complete',
        'message': f"{user_name}, you have completed your DTR for today."
    }

def record_attendance(card_uid):
    """Process an RFID scan and record attendance."""
    try:
        # Get user by card UID
        user = get_user_by_card_uid(card_uid)
        
        if not user:
            return {
                'success': False,
                'message': "Unregistered RFID card. Please contact administrator."
            }
        
        # Determine and execute appropriate action
        result = determine_action(user['id'], user['name'])
        
        # Send to web interface (if needed)
        # This could be done via a local web server or websockets
        # For this example, we'll just print to the console
        print(f"Scan result: {result['message']}")
        
        return result
    
    except Exception as e:
        print(f"Error recording attendance: {e}")
        return {
            'success': False,
            'message': f"System error: {e}"
        }

def main():
    """Main function to run the RFID scanner."""
    pn532 = setup()
    
    print("Waiting for RFID/NFC card...")
    last_uid = None
    last_scan_time = 0
    
    # Minimum time between same card scans (to prevent duplicates)
    SCAN_COOLDOWN = 3  # seconds
    
    try:
        while True:
            # Check if a card is available to read
            uid = pn532.read_passive_target(timeout=0.5)
            
            # If no card is found, keep looking
            if uid is None:
                continue
            
            # Convert UID bytes to hex string
            card_uid = ''.join([hex(i)[2:].zfill(2) for i in uid]).upper()
            current_time = time.time()
            
            # Prevent duplicate scans of the same card
            if card_uid == last_uid and current_time - last_scan_time < SCAN_COOLDOWN:
                time.sleep(0.1)
                continue
            
            print(f"Card detected with UID: {card_uid}")
            
            # Process the scan
            result = record_attendance(card_uid)
            
            # Provide feedback
            provide_feedback(result['success'])
            
            # Update tracking variables
            last_uid = card_uid
            last_scan_time = current_time
            
            # Pause briefly
            time.sleep(0.5)
            
    except KeyboardInterrupt:
        GPIO.cleanup()
        print("Program terminated.")

if __name__ == "__main__":
    main()
