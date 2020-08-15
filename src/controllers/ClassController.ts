import {Request, Response} from 'express'

import db from '../database/connection';
import convertHourToMinutes from '../utils/convertHourToMinutes';

interface ScheduleItem {
    week_day: number;
    from: string;
    to: string;
}

export default class ClassController { 
    async index(request: Request, response: Response) {

        const filters = request.query;

        const subject = filters.subject as string;
        const week_day = filters.week_day as string;
        const time = filters.time as string;

        if(!week_day|| !subject || !time){
            return response.status(400).json({
                error: 'Missing filters to search classes'
            });
        }

        const timeInMinutes = convertHourToMinutes(time);

        const classes = await db('class')
            .whereExists(function() {
                this.select('class_schedule.*')
                .from('class_schedule')
                .whereRaw('`class_schedule`.`class_id` = `class`.`id`')
                .whereRaw('`class_schedule`.`week_day` = ??', [Number(week_day)])
                .whereRaw('`class_schedule`.`from` <= ??', [Number(timeInMinutes)])
                .whereRaw('`class_schedule`.`to` > ??', [Number(timeInMinutes)])
            })
            .where('class.subject', '=', subject)
            .join('user', 'class.user_id', '=', 'user.id')
            .select(['class.*', 'user.*']);

        return response.json(classes);
    }

    async create (request: Request, response: Response) {
        const {
            name,
            avatar,
            whatsapp,
            bio,
            subject,
            cost,
            schedule
        } = request.body;
    
        const trx = await db.transaction();
    
        try {
            const insertedUsersIds = await trx('user').insert({
                name,
                avatar,
                whatsapp,
                bio,
            });
        
            const user_id = insertedUsersIds[0];
        
            const insertedClassesIds = await trx('class').insert({
                subject,
                cost,
                user_id,
            });
        
            const class_id = insertedClassesIds[0];
        
            const classSchedule = schedule.map((scheduleItem: ScheduleItem) => {
                return {
                    class_id,
                    week_day: scheduleItem.week_day,
                    from: convertHourToMinutes(scheduleItem.from),
                    to: convertHourToMinutes(scheduleItem.to)
                };
            })
        
            await trx('class_schedule').insert(classSchedule);
        
            await trx.commit();
            return response.status(201).send();
        } catch (err) {
            trx.rollback();
            return response.status(400).json({
                error: 'Unexpected error while creating new class'
            })
        }
    }
}