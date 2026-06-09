# Firestore Security Specification & TDD Test Plan

Here we document the security invariants, adversarial exploit attempt payloads ("Dirty Dozen"), and validation rules for our DriveCare vehicle tracking application.

## 1. Security Invariants

1. **User Ownership**: No user can read or write any vehicle document, reminder tracking document, or service log document belonging to another user.
2. **Profile Isolation**: A user can only register or edit their own profile document (`/users/{userId}`). Users cannot register or update profiles of other users.
3. **Master Gate Enforcement (Parent Ownership Verification)**: A service log or reminder under `/vehicles/{vehicleId}` can only be created, modified, or read if the client is authenticated and is the verified owner of the parent vehicle document (i.e. `/vehicles/{vehicleId}` has `userId` matching `request.auth.uid`).
4. **Data Integrity & Server Timestamps**: Critical dates such as `createdAt` must be set via the secure server timestamp mechanism (`request.time`), and cannot be backdated or spoofed via client payloads.
5. **Aesthetic/Poisoning Guard**: Fields like vehicle year or mileage must have strictly bounded values (e.g., year between 1900 and 2100; mileage non-negative) to prevent system-busting inputs or "Denial of Wallet" resource exhaustion.

---

## 2. The "Dirty Dozen" Attack Payloads

Below are twelve malicious payloads representing identity spoofing, state shortcuts, and resource poisoning that our security rules are mathematically designed to block.

### Exploit 1: User Profile Spoofing
* **Attempt**: An authenticated user `attacker123` attempts to write profile data to `/users/victim456`.
* **Payload**: `{ "id": "victim456", "name": "Fake Profile", "email": "victim@domain.com", "createdAt": "2026-06-09T05:00:00Z" }`
* **Target Path**: `users/victim456`
* **Result**: `PERMISSION_DENIED` (Blocked by owner UID matching requirement).

### Exploit 2: Create Vehicle for Another User
* **Attempt**: Authenticated user `attacker123` attempts to create a vehicle with `userId` set to `victim456` to charge them counts.
* **Payload**: `{ "id": "vehicle_leak", "userId": "victim456", "make": "Bug", "model": "Model-X", "year": 2024, "vin": "", "currentMileage": 500, "createdAt": "2026-06-09T05:00:00Z" }`
* **Target Path**: `vehicles/vehicle_leak`
* **Result**: `PERMISSION_DENIED` (Blocked by `incoming().userId == request.auth.uid` validation).

### Exploit 3: Read Another User's Vehicle
* **Attempt**: User `attacker123` attempts to view `/vehicles/victim_car` which belongs to `victim456`.
* **Target Path**: `vehicles/victim_car`
* **Result**: `PERMISSION_DENIED` (Blocked by `resource.data.userId == request.auth.uid` read-protection).

### Exploit 4: Write Log for Someone Else's Vehicle
* **Attempt**: User `attacker123` attempts to add a maintenance log under a vehicle `/vehicles/victim_car` owned by `victim456`.
* **Payload**: `{ "id": "spam_log_1", "vehicleId": "victim_car", "date": "2026-06-09", "serviceType": "Fictional Air Filter swap", "cost": 999999, "mileageAtService": 60000, "createdAt": "2026-06-09T05:00:00Z" }`
* **Target Path**: `vehicles/victim_car/logs/spam_log_1`
* **Result**: `PERMISSION_DENIED` (Blocked by Master Gate: unable to verify ownership of parent `/vehicles/victim_car` for `attacker123`).

### Exploit 5: Spoof `createdAt` Timestamp on Vehicle Creation
* **Attempt**: User `attacker123` tries to save a vehicle with a retro-dated `createdAt` string instead of `request.time`.
* **Payload**: `{ "id": "my_car_1", "userId": "attacker123", "make": "Hyundai", "model": "Kona", "year": 2020, "vin": "", "currentMileage": 114550, "createdAt": "1999-01-01T00:00:00Z" }`
* **Target Path**: `vehicles/my_car_1`
* **Result**: `PERMISSION_DENIED` (Blocked by strict `incoming().createdAt == request.time` verification).

### Exploit 6: Overwrite/Mutate Immutable `createdAt` Space
* **Attempt**: User tries to update an existing vehicle to change its initial `createdAt` field.
* **Payload**: `{ "createdAt": "2010-01-01T00:00:00Z" }` (as a partial update)
* **Target Path**: `vehicles/my_car_1`
* **Result**: `PERMISSION_DENIED` (Blocked by immutable field guard: `incoming().createdAt == existing().createdAt`).

### Exploit 7: SQL Injection/Poisoning ID String Injection
* **Attempt**: User sets a massive query-breaker or exploit-code string as a document ID.
* **Target Path**: `vehicles/my_car_1;DROP COLLECTION users;`
* **Result**: `PERMISSION_DENIED` (Blocked by strict `isValidId()` regex guard pattern).

### Exploit 8: Denial of Wallet - Unreasonably Large Mileage Value
* **Attempt**: Injecting a massive string or number overflow in vehicle `currentMileage`.
* **Payload**: `{ "id": "my_car_2", "userId": "attacker123", "make": "Kona", "model": "EV", "year": 2020, "vin": "", "currentMileage": 9999999999, "createdAt": "2026-06-09T05:00:00Z" }`
* **Target Path**: `vehicles/my_car_2`
* **Result**: `PERMISSION_DENIED` (Blocked by mileage range bounds).

### Exploit 9: Invalid Vehicle Year Out of Safe Timeline Range
* **Attempt**: Setting the manufacture year of the vehicle to `5000` or `1500`.
* **Payload**: `{ "id": "my_car_3", "userId": "attacker123", "make": "Futuristic", "model": "Flyer", "year": 5000, "vin": "", "currentMileage": 100, "createdAt": "2026-06-09T05:00:00Z" }`
* **Target Path**: `vehicles/my_car_3`
* **Result**: `PERMISSION_DENIED` (Blocked by year bounds checker `year >= 1900 && year <= 2100`).

### Exploit 10: Bypass Validation with Ghost/Shadow fields
* **Attempt**: Sneaking in a shadow field like `"isAdmin": true` or `"isVerified": true` during a service log write.
* **Payload**: `{ "id": "log_shadow", "vehicleId": "my_car_1", "date": "2026-06-09", "serviceType": "Oil", "cost": 50, "mileageAtService": 25000, "createdAt": "2026-06-09T05:00:00Z", "isAdmin": true }`
* **Target Path**: `vehicles/my_car_1/logs/log_shadow`
* **Result**: `PERMISSION_DENIED` (Blocked by exact key properties matching count check).

### Exploit 11: Modify Immutable Parent Vehicle Association
* **Attempt**: User tries to update an existing maintenance log to point to a different vehicle ID.
* **Payload**: `{ "vehicleId": "another_car_id" }`
* **Target Path**: `vehicles/my_car_1/logs/log_1`
* **Result**: `PERMISSION_DENIED` (Blocked by immutable `vehicleId` checks).

### Exploit 12: Blanket Multi-user Data Read
* **Attempt**: Attacker queries the entire `/vehicles` collection without any query filter to scrape all users' private vehicle registers.
* **Target Path**: `/vehicles` (list request)
* **Result**: `PERMISSION_DENIED` (Blocked by strict list query rule requiring ownership constraints).
