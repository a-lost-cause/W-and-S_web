
        // --- 1. CANVAS & VISUALIZER SETUP ---
        const canvas = document.getElementById("history");
        const ctx = canvas.getContext("2d");

        function resizeCanvas() {
            const rect = canvas.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0); 
        }
        window.addEventListener("resize", resizeCanvas);
        resizeCanvas();

        // --- 2. WEB AUDIO & ANALYSER SETUP ---
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        let audioContext = null;
        let analyser1, analyser2;
        let data1, data2;
        let isAudioInitialized = false;

        function initAudioVisualizer() {
            if (isAudioInitialized) return;
            
            audioContext = new AudioContext();
            analyser1 = audioContext.createAnalyser();
            analyser2 = audioContext.createAnalyser();

            analyser1.fftSize = 1024;
            analyser2.fftSize = 1024;
            analyser1.smoothingTimeConstant = 0.7;
            analyser2.smoothingTimeConstant = 0.7;

            // Connect Turbine Audio sources (A, B, C) to Analyser 1
            ['audio-A', 'audio-B', 'audio-C'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    const source = audioContext.createMediaElementSource(el);
                    source.connect(analyser1);
                }
            });
            analyser1.connect(audioContext.destination);

            // Connect Background Audio sources (bgn1, bgn2, bgn3) to Analyser 2
            ['bgn1', 'bgn2', 'bgn3', 'bgn4', 'bgn5', 'bgn6'].forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    const source = audioContext.createMediaElementSource(el);
                    source.connect(analyser2);
                }
            });
            analyser2.connect(audioContext.destination);

            data1 = new Uint8Array(analyser1.fftSize);
            data2 = new Uint8Array(analyser2.fftSize);

            isAudioInitialized = true;
            requestAnimationFrame(animate_visual);
        }

        // --- 3. GRAPH RENDERING & HISTORY ---
        const HISTORY_LENGTH = 500;
        const history1 = [];
        const history2 = [];

        function getLevel(analyser, data) {
            if (!analyser || !data) return 0;
            analyser.getByteTimeDomainData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i++) {
                const value = (data[i] - 128) / 128;
                sum += value * value; 
            }
            const rms = Math.sqrt(sum / data.length);
            // return Math.min(100, rms * 140); 
            const p_ref = 2.e-05;
            return 20 * Math.log10(rms / p_ref);
        }
        

        function drawGraph() {
            const width = canvas.clientWidth;
            const height = canvas.clientHeight;
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = "#050505";
            ctx.fillRect(0, 0, width, height);

            // Horizontal grid
            ctx.lineWidth = 1;
            ctx.strokeStyle = "#222";
            for (let i = 0; i <= 10; i++) {
                const y = height - (i / 10) * height;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke(); 
            }

            // Vertical grid
            const verticalLines = 10;
            for (let i = 0; i <= verticalLines; i++) {
                const x = (i / verticalLines) * width;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();    
            }

              // Y-axis labels
            ctx.fillStyle = "#777";
            ctx.font = "12px Arial";
            ctx.textAlign = "left";
            for (let i = 0; i <= 10; i++) {
                const value = i * 10;
                const y = height - (i / 10) * height;
                //ctx.fillText(value + "%", 5, y - 4); 
            } 

            // Draw History Lines
            drawHistory(history1, "#7fd0a0", width, height);
            drawHistory(history2, "#4aaeff", width, height);

            // Legend
            ctx.font = "14px Arial";
            ctx.textAlign = "Center";
            ctx.fillStyle = "#7fd0a0"; 
            ctx.fillText("● Turbine Audio", 70, 25);
            ctx.fillStyle = "#4aaeff"; 
            ctx.fillText("● Background", 190, 25);
        }

        function drawHistory(history, color, width, height) {
            if (history.length < 2) return;
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            for (let i = 0; i < history.length; i++) {
                const x = (i / (HISTORY_LENGTH - 1)) * width;
                const value = history[i];
                const y = height - (value / 100) * height;
                if (i === 0) { ctx.moveTo(x, y); } 
                else { ctx.lineTo(x, y); } 
            }
            ctx.stroke();
        }

        // Render initial blank graph immediately on load
        drawGraph();

        // --- 4. ANIMATION LOOP FOR VISUALIZER ---
        let lastSampleTime = 0;
        const SAMPLE_INTERVAL = 30;

        function animate_visual(timestamp) {
            requestAnimationFrame(animate_visual);
            
            if (timestamp - lastSampleTime < SAMPLE_INTERVAL) {
                drawGraph();
                return; 
            }
            lastSampleTime = timestamp;

            if (isAudioInitialized) {
                const level1 = getLevel(analyser1, data1);
                const level2 = getLevel(analyser2, data2);

                history1.push(level1);
                history2.push(level2);

                if (history1.length > HISTORY_LENGTH) history1.shift();
                if (history2.length > HISTORY_LENGTH) history2.shift();
            }
            drawGraph();
        }

        // --- 5. AUDIO CONTROLS & BACKGROUND TRACKS ---
        const backgroundTracks = {
            'btn_bgn1': document.getElementById('bgn1'),
            'btn_bgn2': document.getElementById('bgn2'),
            'btn_bgn3': document.getElementById('bgn3'),
            'btn_bgn4': document.getElementById('bgn4'),
            'btn_bgn5': document.getElementById('bgn5'), 
            'btn_bgn6': document.getElementById('bgn6')   
        };
        const backgroundButtonIds = ['btn_bgn1', 'btn_bgn2', 'btn_bgn3', 'btn_bgn4', 'btn_bgn5', 'btn_bgn6'];

        backgroundButtonIds.forEach(btnId => {
            const button = document.getElementById(btnId);  
            if (!button) return;

            button.addEventListener('click', () => {
                initAudioVisualizer(); // Ensure audio context is ready
                const isActive = button.classList.contains('active');
                
                backgroundButtonIds.forEach(id => { document.getElementById(id).classList.remove('active'); });
                Object.values(backgroundTracks).forEach(audio => { audio.pause(); audio.currentTime = 0; });

                if (!isActive) {        
                    button.classList.add('active');
                    if (backgroundTracks[btnId]) { 
                        backgroundTracks[btnId].play().catch(error => {
                            console.warn("Audio playback was blocked or failed:", error); 
                        });  
                    } 
                }  
            });
        });

        function stopBgnAudio() {      
            Object.values(backgroundTracks).forEach(audio => { audio.pause(); audio.currentTime = 0; }); 
            backgroundButtonIds.forEach(id => { 
                const button = document.getElementById(id);
                if (button) button.classList.remove('active'); 
            });  
        }

        const WTaudioElements = {
            A: document.getElementById('audio-A'),
            B: document.getElementById('audio-B'),
            C: document.getElementById('audio-C')         
        };
                
        Object.values(WTaudioElements).forEach(audio => { 
            audio.loop = true;
            audio.addEventListener('ended', () => { 
                audio.currentTime = 0;
                if (isAudioPlaying) { audio.play().catch(e => console.log("Audio loop error:", e)); } 
            }); 
        });

        let isAudioPlaying = false;
        let activeAudio = WTaudioElements['A'];
        const btnAudio = document.getElementById('btn-audio');

        function stopAllAudio() { 
            Object.values(WTaudioElements).forEach(audio => { audio.pause(); audio.currentTime = 0; });     
        }

        function updateAudioProfile(viewKey) { 
            stopAllAudio();
            activeAudio = WTaudioElements[viewKey];            
            if (isAudioPlaying) { activeAudio.play().catch(e => console.log("Audio play blocked/error:", e)); }        
        }

        btnAudio.addEventListener('click', async () => {
            initAudioVisualizer(); // Initialize Web Audio graph on click
            if (audioContext && audioContext.state === 'suspended') {
                await audioContext.resume();
            }

            isAudioPlaying = !isAudioPlaying;
            if (isAudioPlaying) {
                btnAudio.textContent = 'Stop Audio';
                btnAudio.classList.add('active');

                try { await activeAudio.play(); } 
                catch (e) {
                    console.error("Audio play error:", e);
                    isAudioPlaying = false;
                    btnAudio.textContent = 'Play Audio';
                    btnAudio.classList.remove('active'); 
                } 
            } else {
                btnAudio.textContent = 'Play Audio';
                btnAudio.classList.remove('active');
                stopAllAudio();
                stopBgnAudio(); 
            }  
        });

        // --- 6. UI CAMERA BUTTON HANDLERS ---
        const btnCamA = document.getElementById('btn-camA');
        const btnCamB = document.getElementById('btn-camB');
        const btnCamC = document.getElementById('btn-camC'); 

        function setCameraView(viewKey) {
            currentCamView = viewKey;            
            btnCamA.classList.remove('active');
            btnCamB.classList.remove('active');
            btnCamC.classList.remove('active');

            if (viewKey === 'A') btnCamA.classList.add('active');
            if (viewKey === 'B') btnCamB.classList.add('active');
            if (viewKey === 'C') btnCamC.classList.add('active');

            const targetView = cameraViews[viewKey];
            camTargetPos.copy(targetView.pos);
            camTargetLookAt.copy(targetView.lookAt);
            updateAudioProfile(viewKey);
        }

        btnCamA.addEventListener('click', () => setCameraView('A'));
        btnCamB.addEventListener('click', () => setCameraView('B'));
        btnCamC.addEventListener('click', () => setCameraView('C'));

        // --- 7. THREE.JS ANIMATION LOOP ---
        const clock = new THREE.Clock();

        function animate() { 
            requestAnimationFrame(animate);
            const delta = clock.getDelta();
            camera.position.lerp(camTargetPos, delta * 3.0);
            camCurrentLookAt.lerp(camTargetLookAt, delta * 3.0);
            camera.lookAt(camCurrentLookAt);
            const rotation_speed = 1.47 // in rad per sec
            rotorGroup.rotation.z += delta * rotation_speed;
            renderer.render(scene, camera);  
        }

        animate();

        // --- 8. WINDOW RESIZE ---
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight); 
        });
    