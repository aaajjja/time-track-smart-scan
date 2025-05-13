
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
import threading
import queue

# Optional: Set up LED pins for feedback
SUCCESS_LED = 17
ERROR_LED = 27
BUZZER = 22

# Setup Firebase
cred = credentials.Certificate("/path/to/serviceAccountKey.json")
firebase_admin.initialize_app(cred)
db = firestore.client()

# In-memory cache for users and attendance records
user_cache = {}
record_cache = {}

# Queue for background processing
process_queue = queue.Queue()

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
    # Check cache first
    if card_uid in user_cache:
        return user_cache[card_uid]
    
    users_ref = db.collection('users')
    query = users_ref.where('cardUID', '==', card_uid).limit(1)
    results = query.get()
    
    for doc in results:
        user_data = doc.to_dict()
        user_data['id'] = doc.id
        # Update cache
        user_cache[card_uid] = user_data
        return user_data
    
    return None

def get_today_record(user_id):
    """Get today's attendance record for a user."""
    today = datetime.datetime.now().strftime('%Y-%m-%d')
    cache_key = f"{user_id}_{today}"
    
    # Check cache first
    if cache_key in record_cache:
        return record_cache[cache_key]
    
    record_ref = db.collection('attendance').document(cache_key)
    record = record_ref.get()
    
    if record.exists:
        record_data = record.to_dict()
        # Update cache
        record_cache[cache_key] = record_data
        return record_data
    
    return None

def determine_action(user_id, user_name):
    """Determine the appropriate action based on today's attendance record."""
    today = datetime.datetime.now().strftime('%Y-%m-%d')
    now = datetime.datetime.now().strftime('%I:%M %p')  # 12-hour format with AM/PM
    cache_key = f"{user_id}_{today}"
    
    # Get existing record or create new one
    record_data = get_today_record(user_id)
    
    if not record_data:
        # No record for today, create new with Time In AM
        record_data = {
            'userId': user_id,
            'userName': user_name,
            'date': today,
            'timeInAM': now
        }
        # Write to Firebase in the background
        process_queue.put(('write', cache_key, record_data))
        # Update cache immediately
        record_cache[cache_key] = record_data
        return {
            'success': True,
            'action': 'Time In AM',
            'time': now,
            'message': f"Welcome {user_name}! Time In AM recorded at {now}"
        }
    
    # Determine next action based on what's already there
    if not record_data.get('timeOutAM'):
        # Has Time In AM but no Time Out AM
        record_data['timeOutAM'] = now
        process_queue.put(('update', cache_key, {'timeOutAM': now}))
        # Update cache
        record_cache[cache_key] = record_data
        return {
            'success': True,
            'action': 'Time Out AM',
            'time': now,
            'message': f"Goodbye {user_name}! Time Out AM recorded at {now}"
        }
    
    if not record_data.get('timeInPM'):
        # Has AM records but no Time In PM
        record_data['timeInPM'] = now
        process_queue.put(('update', cache_key, {'timeInPM': now}))
        # Update cache
        record_cache[cache_key] = record_data
        return {
            'success': True,
            'action': 'Time In PM',
            'time': now,
            'message': f"Welcome back {user_name}! Time In PM recorded at {now}"
        }
    
    if not record_data.get('timeOutPM'):
        # Has Time In PM but no Time Out PM
        record_data['timeOutPM'] = now
        process_queue.put(('update', cache_key, {'timeOutPM': now}))
        # Update cache
        record_cache[cache_key] = record_data
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
        
        print(f"Scan result: {result['message']}")
        
        return result
    
    except Exception as e:
        print(f"Error recording attendance: {e}")
        return {
            'success': False,
            'message': f"System error: {e}"
        }

def background_worker():
    """Background thread to process Firebase operations."""
    while True:
        try:
            # Get operation from queue
            operation, key, data = process_queue.get()
            
            if operation == 'write':
                # Write new document
                db.collection('attendance').document(key).set(data)
            elif operation == 'update':
                # Update existing document
                db.collection('attendance').document(key).update(data)
            
            # Mark task as done
            process_queue.task_done()
        except Exception as e:
            print(f"Background worker error: {e}")
        
        # Small sleep to avoid CPU overuse
        time.sleep(0.01)

def main():
    """Main function to run the RFID scanner."""
    pn532 = setup()
    
    # Start background worker
    worker_thread = threading.Thread(target=background_worker, daemon=True)
    worker_thread.start()
    
    print("Waiting for RFID/NFC card...")
    last_uid = None
    last_scan_time = 0
    
    # Minimum time between same card scans (to prevent duplicates)
    SCAN_COOLDOWN = 3  # seconds
    
    try:
        while True:
            # Check if a card is available to read
            uid = pn532.read_passive_target(timeout=0.1)  # Reduced timeout for faster response
            
            # If no card is found, keep looking
            if uid is None:
                time.sleep(0.05)  # Short sleep to reduce CPU usage
                continue
            
            # Convert UID bytes to hex string
            card_uid = ''.join([hex(i)[2:].zfill(2) for i in uid]).upper()
            current_time = time.time()
            
            # Prevent duplicate scans of the same card
            if card_uid == last_uid and current_time - last_scan_time < SCAN_COOLDOWN:
                time.sleep(0.05)
                continue
            
            print(f"Card detected with UID: {card_uid}")
            
            # Process the scan
            result = record_attendance(card_uid)
            
            # Provide feedback
            provide_feedback(result['success'])
            
            # Update tracking variables
            last_uid = card_uid
            last_scan_time = current_time
            
    except KeyboardInterrupt:
        # Wait for background tasks to complete
        process_queue.join()
        GPIO.cleanup()
        print("Program terminated.")

if __name__ == "__main__":
    main()
